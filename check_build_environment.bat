@echo off
echo ================================
echo 检查 Android 构建环境
echo ================================
echo.

echo 1. 检查 Java...
java -version
if %errorlevel% neq 0 (
    echo [错误] Java 未安装或未添加到 PATH
) else (
    echo [成功] Java 已安装
)
echo.

echo 2. 检查 CMake...
cmake --version
if %errorlevel% neq 0 (
    echo [错误] CMake 未安装或未添加到 PATH
    echo 请安装 CMake 3.18.1 或更高版本
) else (
    echo [成功] CMake 已安装
)
echo.

echo 3. 检查 Ninja...
ninja --version
if %errorlevel% neq 0 (
    echo [错误] Ninja 未安装或未添加到 PATH
    echo 请通过 Android Studio SDK Manager 安装 CMake 工具
) else (
    echo [成功] Ninja 已安装
)
echo.

echo 4. 检查 Gradle...
gradle --version
if %errorlevel% neq 0 (
    echo [警告] Gradle 未安装或未添加到 PATH
    echo 项目使用 Gradle Wrapper，这不是必需的
) else (
    echo [成功] Gradle 已安装
)
echo.

echo 5. 检查环境变量...
if "%ANDROID_HOME%" == "" (
    echo [警告] ANDROID_HOME 环境变量未设置
    echo 请设置 ANDROID_HOME 为您的 Android SDK 路径
) else (
    echo [成功] ANDROID_HOME: %ANDROID_HOME%
)

if "%JAVA_HOME%" == "" (
    echo [警告] JAVA_HOME 环境变量未设置
) else (
    echo [成功] JAVA_HOME: %JAVA_HOME%
)
echo.

echo ================================
echo 检查完成
echo ================================
pause 