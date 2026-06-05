cmake_minimum_required(VERSION 3.20)
project(BeFitNow)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

add_executable(BeFitNow
    main.cpp
    src/models/Enums.cpp
    src/services/BeFitNowService.cpp
    src/ui/ConsoleIo.cpp
    src/ui/UserConsoleApp.cpp
    src/ui/AdminConsoleApp.cpp
    src/ui/AIAssistantApp.cpp
    src/ui/TrainerConsoleApp.cpp
    src/ui/SupportConsoleApp.cpp
    src/ui/LauncherApp.cpp
)
