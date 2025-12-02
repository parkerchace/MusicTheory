#include "MusicTheoryPlugin.h"
#include "pluginterfaces/base/ibstream.h"
#include <algorithm>

using namespace Steinberg;
using namespace Steinberg::Vst;

MusicTheoryPlugin::MusicTheoryPlugin() {
    httpClient_ = std::make_unique<HttpClient>("http://127.0.0.1:5544");
}

MusicTheoryPlugin::~MusicTheoryPlugin() {}

tresult PLUGIN_API MusicTheoryPlugin::initialize(FUnknown* context) {
    tresult result = AudioEffect::initialize(context);
    if (result != kResultOk) return result;
    setBusArrangements(SpeakerArr::kEmpty, 0, SpeakerArr::kEmpty, 0); // MIDI only
    return kResultOk;
}

tresult PLUGIN_API MusicTheoryPlugin::terminate() {
    httpClient_.reset();
    return AudioEffect::terminate();
}

void MusicTheoryPlugin::flushChord() {
    if (!currentChordNotes_.empty()) {
        ChordTask task;
        // convert MIDI ints to note name strings (C4, D#3, ...)
        static const char* names[] = {"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"};
        task.notes.clear();
        for (int midi : currentChordNotes_) {
            int pc = midi % 12;
            int oct = (midi / 12) - 1; // inverse of (octave+1)*12 + semitone
            std::string n = std::string(names[pc]) + std::to_string(oct);
            task.notes.push_back(n);
        }
        task.velocity = lastVelocity_;
        // Compute duration from earliest note-on to now (approximate)
        int64 nowSamples = lastBarSamplePos_; // will be updated by caller before flush
        if (!noteOnSamplePos_.empty()) {
            int64 earliest = *std::min_element(noteOnSamplePos_.begin(), noteOnSamplePos_.end());
            int64 span = std::max<int64>(0, nowSamples - earliest);
            double ms = (double)span * 1000.0 / sampleRate_;
            task.durationMs = (int)std::clamp(ms, 50.0, 4000.0);
        } else {
            task.durationMs = 1000; // fallback
        }
        if (sendBatchProgression_) {
            // store beat duration based on task.durationMs
            progressionBuffer_.push_back(task);
            const size_t barsPerBatch = 4;
            if (progressionBuffer_.size() >= barsPerBatch) {
                // send progression
                bool ok = httpClient_->postProgression(progressionBuffer_, (int)tempoBPM_, lastVelocity_);
                if (!ok) {
                    printf("[MusicTheoryPlugin] progression post failed: %s\n", httpClient_->getLastError().c_str());
                } else {
                    printf("[MusicTheoryPlugin] progression posted (%zu chords)\n", progressionBuffer_.size());
                }
                progressionBuffer_.clear();
            }
        } else {
            httpClient_->enqueueChord(task);
            // print last status when enqueued (worker will update lastStatus/lastError)
            printf("[MusicTheoryPlugin] chord enqueued (%zu notes)\n", task.notes.size());
        }
        currentChordNotes_.clear();
        noteOnSamplePos_.clear();
    }
}

bool MusicTheoryPlugin::isBarBoundary(int64 currentSamplePos, double samplesPerBar) const {
    return currentSamplePos - lastBarSamplePos_ >= samplesPerBar;
}

void MusicTheoryPlugin::handleMidiEvents(ProcessData& data) {
    // Parse incoming MIDI events
    if (data.inputEvents) {
        for (int32 i = 0; i < data.inputEvents->getEventCount(); ++i) {
            Event e; data.inputEvents->getEvent(i, e);
            if (e.type == Event::kNoteOnEvent) {
                currentChordNotes_.push_back(e.noteOn.pitch);
                lastVelocity_ = e.noteOn.velocity;
                // Approximate sample position based on musical time
                int64 pos = (int64)(data.processContext && (data.processContext->state & ProcessContext::kProjectTimeMusicValid)
                    ? data.processContext->projectTimeMusic * (sampleRate_ * (60.0/tempoBPM_))
                    : 0);
                noteOnSamplePos_.push_back(pos);
                lastActiveNoteSample_ = pos;
            } else if (e.type == Event::kNoteOffEvent) {
                auto it = std::find(currentChordNotes_.begin(), currentChordNotes_.end(), e.noteOff.pitch);
                if (it != currentChordNotes_.end()) currentChordNotes_.erase(it);
                // Remove corresponding timestamp (first match)
                if (!noteOnSamplePos_.empty()) noteOnSamplePos_.erase(noteOnSamplePos_.begin());
                // if no active notes remain, mark the silence start
                if (currentChordNotes_.empty()) {
                    int64 pos = (int64)(data.processContext && (data.processContext->state & ProcessContext::kProjectTimeMusicValid)
                        ? data.processContext->projectTimeMusic * (sampleRate_ * (60.0/tempoBPM_))
                        : 0);
                    lastActiveNoteSample_ = pos;
                }
            } else if (e.type == Event::kDataEvent) {
                // Could parse tempo/time signature if transmitted via custom Sysex or data events.
            }
        }
    }
}

tresult PLUGIN_API MusicTheoryPlugin::process(ProcessData& data) {
    if (data.processContext && (data.processContext->state & ProcessContext::kTempoValid)) {
        tempoBPM_ = data.processContext->tempo;
    }
    if (data.processContext && (data.processContext->state & ProcessContext::kTimeSigValid)) {
        timeSigNum_ = data.processContext->timeSigNumerator;
        timeSigDen_ = data.processContext->timeSigDenominator;
    }
    if (data.processContext && (data.processContext->state & ProcessContext::kSampleRateValid)) {
        sampleRate_ = data.processContext->sampleRate;
    }

    handleMidiEvents(data);

    // Determine bar length in samples
    double beatsPerBar = (double)timeSigNum_ * (4.0 / (double)timeSigDen_);
    double secondsPerBeat = 60.0 / tempoBPM_;
    double samplesPerBar = secondsPerBeat * beatsPerBar * sampleRate_;

    // We approximate current sample position; DAWs provide musicalPosition etc.
    if (data.processContext && (data.processContext->state & ProcessContext::kProjectTimeMusicValid)) {
        double musicalPosQN = data.processContext->projectTimeMusic; // quarter notes position
        double samplesPos = musicalPosQN * (sampleRate_ * (60.0/tempoBPM_));
        int64 currentSamples = (int64)samplesPos;

        // Silence-based mid-bar flush: if no active notes for configured ms, flush early
        if (currentChordNotes_.empty() && lastActiveNoteSample_ > 0) {
            int64 silenceSamplesThreshold = (int64)((double)silenceFlushMs_ * sampleRate_ / 1000.0);
            if (currentSamples - lastActiveNoteSample_ >= silenceSamplesThreshold) {
                // set lastBarSamplePos_ for duration calc
                lastBarSamplePos_ = currentSamples;
                flushChord();
                // reset marker so we don't repeatedly flush
                lastActiveNoteSample_ = 0;
            }
        }

        if (isBarBoundary(currentSamples, samplesPerBar)) {
            // Use currentSamples for duration calculation
            lastBarSamplePos_ = currentSamples;
            flushChord();
        }
    }

    return kResultOk;
}

tresult PLUGIN_API MusicTheoryPlugin::setState(IBStream* state) { return kResultOk; }

tresult PLUGIN_API MusicTheoryPlugin::getState(IBStream* state) { return kResultOk; }

void MusicTheoryPlugin::sendProgressionNow() {
    if (progressionBuffer_.empty()) return;
    httpClient_->postProgression(progressionBuffer_, (int)tempoBPM_, lastVelocity_);
    progressionBuffer_.clear();
}
