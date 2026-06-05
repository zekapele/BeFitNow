#include "ui/ConsoleIo.h"

#include <iostream>
#include <limits>

int ConsoleIo::readInt(const std::string& prompt) {
    while (true) {
        std::cout << prompt;
        int value;
        if (std::cin >> value) {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return value;
        }
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cout << "Введіть ціле число.\n";
    }
}

double ConsoleIo::readDouble(const std::string& prompt) {
    while (true) {
        std::cout << prompt;
        double value;
        if (std::cin >> value) {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return value;
        }
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cout << "Введіть число.\n";
    }
}

std::string ConsoleIo::readLine(const std::string& prompt) {
    std::cout << prompt;
    std::string line;
    std::getline(std::cin, line);
    return line;
}

bool ConsoleIo::readYesNo(const std::string& prompt) {
    while (true) {
        const std::string answer = readLine(prompt + " (так/ні): ");
        if (answer == "так" || answer == "Так" || answer == "yes" || answer == "y") return true;
        if (answer == "ні" || answer == "Ні" || answer == "no" || answer == "n") return false;
        std::cout << "Введіть \"так\" або \"ні\".\n";
    }
}
