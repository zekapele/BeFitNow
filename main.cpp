#include "services/BeFitNowService.h"
#include "ui/LauncherApp.h"

int main() {
    BeFitNowService service;
    LauncherApp launcher(service);
    launcher.run();
    return 0;
}
