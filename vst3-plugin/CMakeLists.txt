cmake_minimum_required(VERSION 3.20)
project(MusicTheoryVST3 VERSION 0.1.0 LANGUAGES CXX)

# User may set VST3_SDK_ROOT externally or pass -DVST3_SDK_ROOT=...
if(NOT DEFINED VST3_SDK_ROOT)
  if(DEFINED ENV{VST3_SDK_ROOT})
    set(VST3_SDK_ROOT $ENV{VST3_SDK_ROOT})
  else()
    # Default to sibling folder ../VST3_SDK if present
    if(EXISTS "${CMAKE_SOURCE_DIR}/../VST3_SDK")
      set(VST3_SDK_ROOT "${CMAKE_SOURCE_DIR}/../VST3_SDK")
    else()
      message(FATAL_ERROR "VST3_SDK_ROOT not set. Please set environment variable or pass -DVST3_SDK_ROOT=<path>")
    endif()
  endif()
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# curl for HTTP requests
find_package(CURL REQUIRED)

# VST3 SDK base sources required for plugin to link
set(VST3_SDK_BASE_SOURCES
    ${VST3_SDK_ROOT}/public.sdk/source/main/pluginfactory.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/common/pluginview.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/vst/vstaudioeffect.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/vst/vstbus.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/vst/vstcomponent.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/vst/vstcomponentbase.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/vst/vsteditcontroller.cpp
    ${VST3_SDK_ROOT}/public.sdk/source/vst/vstparameters.cpp
    ${VST3_SDK_ROOT}/base/source/fstring.cpp
    ${VST3_SDK_ROOT}/base/source/fstreamer.cpp
    ${VST3_SDK_ROOT}/base/source/fbuffer.cpp
    ${VST3_SDK_ROOT}/pluginterfaces/base/funknown.cpp
    ${VST3_SDK_ROOT}/pluginterfaces/base/ustring.cpp
    ${VST3_SDK_ROOT}/pluginterfaces/base/coreiids.cpp
)

# Project sources
set(PLUGIN_NAME MusicTheoryVST3)
set(PLUGIN_SRC
    src/plugin/MusicTheoryPlugin.cpp
    src/plugin/MusicTheoryPlugin.h
    src/plugin/MusicTheoryController.cpp
    src/plugin/MusicTheoryController.h
    src/entry.cpp
    src/version.h
    src/network/HttpClient.cpp
    src/network/HttpClient.h
)

add_library(${PLUGIN_NAME} SHARED ${PLUGIN_SRC} ${VST3_SDK_BASE_SOURCES})

# VST3 SDK include directories
target_include_directories(${PLUGIN_NAME} PRIVATE
  ${VST3_SDK_ROOT}
  ${VST3_SDK_ROOT}/pluginterfaces
  ${VST3_SDK_ROOT}/public.sdk
  ${VST3_SDK_ROOT}/public.sdk/source
  ${VST3_SDK_ROOT}/base
  src
)

# Platform-specific defines
if(WIN32)
    target_compile_definitions(${PLUGIN_NAME} PRIVATE UNICODE _UNICODE)
endif()

# Link libcurl
target_link_libraries(${PLUGIN_NAME} PRIVATE CURL::libcurl)

# Ensure C++17
target_compile_features(${PLUGIN_NAME} PRIVATE cxx_std_17)

# Set plugin properties
set_target_properties(${PLUGIN_NAME} PROPERTIES
  OUTPUT_NAME "MusicTheoryVST3"
  PREFIX ""
  SUFFIX ".vst3"
)

# Installation
if(WIN32)
    set(VST3_INSTALL_DIR "$ENV{ProgramFiles}/Common Files/VST3")
else()
    set(VST3_INSTALL_DIR "~/.vst3")
endif()
install(TARGETS ${PLUGIN_NAME} DESTINATION "${VST3_INSTALL_DIR}")

message(STATUS "Configured ${PLUGIN_NAME}. VST3 SDK: ${VST3_SDK_ROOT}")
