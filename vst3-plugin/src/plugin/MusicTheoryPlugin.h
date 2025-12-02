#pragma once
#include "public.sdk/source/vst/vstaudioeffect.h"
#include "network/HttpClient.h"
#include <vector>
#include <memory>

class MusicTheoryPlugin : public Steinberg::Vst::AudioEffect {
public:
    MusicTheoryPlugin();
    ~MusicTheoryPlugin() override;

    static Steinberg::FUnknown* createInstance(void*) { return (Steinberg::Vst::AudioEffect*)new MusicTheoryPlugin(); }

    Steinberg::tresult PLUGIN_API initialize(FUnknown* context) SMTG_OVERRIDE;
    Steinberg::tresult PLUGIN_API terminate() SMTG_OVERRIDE;

    Steinberg::tresult PLUGIN_API process(Steinberg::Vst::ProcessData& data) SMTG_OVERRIDE;
    Steinberg::tresult PLUGIN_API setState(Steinberg::IBStream* state) SMTG_OVERRIDE;
    Steinberg::tresult PLUGIN_API getState(Steinberg::IBStream* state) SMTG_OVERRIDE;

private:
    std::unique_ptr<HttpClient> httpClient_;
    double sampleRate_ {44100.0};
    double tempoBPM_ {120.0};
    int64 lastBarSamplePos_ {0};
    int32 timeSigNum_ {4};
    int32 timeSigDen_ {4};

    std::vector<int> currentChordNotes_;
    int lastVelocity_ {90};
    std::vector<int64> noteOnSamplePos_; // parallel to currentChordNotes_
    // Silence flush: if no active notes for this many ms, flush the chord mid-bar
    int silenceFlushMs_ {250};
    int64 lastActiveNoteSample_ {0};

    // Progression batching
    bool sendBatchProgression_ {false};
    std::vector<ChordTask> progressionBuffer_; // reuse ChordTask struct from HttpClient

    void handleMidiEvents(Steinberg::Vst::ProcessData& data);
    bool isBarBoundary(int64 currentSamplePos, double samplesPerBar) const;
    void flushChord();
    void sendProgressionNow();
    int64 currentSampleEstimate(const Steinberg::Vst::ProcessData& data) const;
};
