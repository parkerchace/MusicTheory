#include "public.sdk/source/main/pluginfactory.h"
#include "plugin/MusicTheoryPlugin.h"
#include "plugin/MusicTheoryController.h"
#include "version.h"

#define kCompanyName "MusicTheoryApp"
#define kVst3Category "Instrument"

using namespace Steinberg::Vst;

BEGIN_FACTORY_DEF(kCompanyName,
                  "https://example.com",
                  "support@example.com")
    DEF_CLASS2(INLINE_UID_FROM_FUID(FUID(0xAB12CD34, 0x5678EF90, 0x12345678, 0x9ABCDEF0)),
               PClassInfo::kManyInstances,
               kVstAudioEffectClass,
               "MusicTheory Bridge",
               Vst::kDistributable,
               kVst3Category,
               FULL_VERSION_STR,
               kCompanyName,
               MusicTheoryPlugin::createInstance)
    // Controller (EditController) registration
    DEF_CLASS2(INLINE_UID_FROM_FUID(FUID(0x12345678, 0x9ABCDEF0, 0xAB12CD34, 0x5678EF90)),
               PClassInfo::kManyInstances,
               kVstComponentControllerClass,
               "MusicTheory Controller",
               0,
               "Controller",
               FULL_VERSION_STR,
               kCompanyName,
               MusicTheoryController::createInstance)
END_FACTORY
