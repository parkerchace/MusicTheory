#pragma once
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <queue>

struct ChordTask {
    std::vector<std::string> notes; // e.g. {"C4","E4","G4"}
    int velocity = 96;
    int durationMs = 2000; // approximate whole note by default
};

class HttpClient {
public:
    explicit HttpClient(const std::string& baseUrl = "http://127.0.0.1:5544");
    ~HttpClient();

    void enqueueChord(const ChordTask& task);
    void setBaseUrl(const std::string& url);
    std::string getLastError() const { return lastError_; }
    std::string getLastStatus() const { return lastStatus_; }
    bool postProgression(const std::vector<ChordTask>& chords, int bpm, int velocity, int channel = 0);

private:
    void workerLoop();
    bool postChord(const ChordTask& task);

    std::string baseUrl_;
    std::thread worker_;
    std::atomic<bool> running_{false};

    std::mutex mtx_;
    std::condition_variable cv_;
    std::queue<ChordTask> queue_;

    std::string lastError_;
    std::string lastStatus_;
};
