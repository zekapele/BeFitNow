#pragma once

#include "services/BeFitNowService.h"

class LauncherApp {
public:
    explicit LauncherApp(BeFitNowService& service);

    void run();

private:
    BeFitNowService& service_;
};
