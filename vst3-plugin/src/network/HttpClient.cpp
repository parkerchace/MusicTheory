#include "HttpClient.h"
#include <curl/curl.h>
#include <sstream>

HttpClient::HttpClient(const std::string& baseUrl) : baseUrl_(baseUrl) {
    running_ = true;
    worker_ = std::thread(&HttpClient::workerLoop, this);
}

HttpClient::~HttpClient() {
    running_ = false;
    cv_.notify_all();
    if (worker_.joinable()) worker_.join();
}

void HttpClient::setBaseUrl(const std::string& url) { baseUrl_ = url; }

void HttpClient::enqueueChord(const ChordTask& task) {
    {
        std::lock_guard<std::mutex> lk(mtx_);
        queue_.push(task);
    }
    cv_.notify_one();
}

bool HttpClient::postChord(const ChordTask& task) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        lastError_ = "curl init failed";
        return false;
    }
    std::ostringstream oss;
    oss << "{\"notes\":[";
    for (size_t i=0;i<task.notes.size();++i) {
        oss << "\"" << task.notes[i] << "\"";
        if (i+1<task.notes.size()) oss << ",";
    }
    oss << "],\"velocity\":" << task.velocity << ",\"duration_ms\":" << task.durationMs << "}";
    std::string payload = oss.str();

    std::string url = baseUrl_ + "/midi/chord";
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, payload.size());
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 1500L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        lastError_ = curl_easy_strerror(res);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        return false;
    }
    long code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &code);
    lastStatus_ = "HTTP " + std::to_string(code);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return code >= 200 && code < 300;
}

bool HttpClient::postProgression(const std::vector<ChordTask>& chords, int bpm, int velocity, int channel) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        lastError_ = "curl init failed";
        return false;
    }
    std::ostringstream oss;
    oss << "{\"chords\":[";
    for (size_t i = 0; i < chords.size(); ++i) {
        const auto& c = chords[i];
        oss << "{\"notes\":[";
        for (size_t j = 0; j < c.notes.size(); ++j) {
            oss << "\"" << c.notes[j] << "\"";
            if (j + 1 < c.notes.size()) oss << ",";
        }
        oss << "],\"duration_beats\":" << (double)c.durationMs / 1000.0 << "}"; // duration_ms -> beats placeholder
        if (i + 1 < chords.size()) oss << ",";
    }
    oss << "],\"bpm\":" << bpm << ",\"velocity\":" << velocity << ",\"channel\":" << channel << "}";

    std::string payload = oss.str();
    std::string url = baseUrl_ + "/midi/progression";

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, payload.size());
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 2000L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        lastError_ = curl_easy_strerror(res);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        return false;
    }
    long code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &code);
    lastStatus_ = "HTTP " + std::to_string(code);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return code >= 200 && code < 300;
}

void HttpClient::workerLoop() {
    while (running_) {
        ChordTask task;
        {
            std::unique_lock<std::mutex> lk(mtx_);
            cv_.wait(lk, [&]{ return !running_ || !queue_.empty(); });
            if (!running_) break;
            task = queue_.front();
            queue_.pop();
        }
        postChord(task); // ignore failure here; error captured in lastError_
    }
}
