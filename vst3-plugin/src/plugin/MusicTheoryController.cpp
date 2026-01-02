#include "MusicTheoryController.h"
#include "pluginterfaces/base/ibstream.h"

using namespace Steinberg;
using namespace Steinberg::Vst;

static const ParamID kParamEnableSend = 1000;
static const ParamID kParamSilenceMs = 1001;
static const ParamID kParamSendNow = 1002;

tresult PLUGIN_API MusicTheoryController::initialize(FUnknown* context)
{
    tresult res = EditController::initialize(context);
    if (res != kResultOk) return res;

    // Create a few parameters so hosts can expose them (even without a GUI)
    auto* param = new Parameter(kParamEnableSend, UString8("Enable Send"), 0, 1, ParameterInfo::kCanAutomate, 0);
    parameters.addParameter(param);

    auto* p2 = new RangeParameter(UString8("Silence ms"), kParamSilenceMs, UString8("ms"), 10.0, 1000.0, 250.0);
    parameters.addParameter(p2);

    auto* p3 = new Parameter(kParamSendNow, UString8("Send Now"), 0, 0, ParameterInfo::kIsReadOnly, 0);
    parameters.addParameter(p3);

    return kResultOk;
}

tresult PLUGIN_API MusicTheoryController::terminate()
{
    return EditController::terminate();
}

tresult PLUGIN_API MusicTheoryController::setComponentState(IBStream* state)
{
    // No state to restore yet
    return kResultOk;
}

IPlugView* PLUGIN_API MusicTheoryController::createView(FIDString name)
{
    // We don't provide a custom editor now — return nullptr to let host use generic parameter view
    return nullptr;
}
