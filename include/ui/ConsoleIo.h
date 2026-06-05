#pragma once

#include <string>

class ConsoleIo {
public:
    static int readInt(const std::string& prompt);
    static double readDouble(const std::string& prompt);
    static std::string readLine(const std::string& prompt);
    static bool readYesNo(const std::string& prompt);
};
