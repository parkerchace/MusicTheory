#pragma once
#include "public.sdk/source/vst/vsteditcontroller.h"

using namespace Steinberg;
using namespace Steinberg::Vst;

class MusicTheoryController : public EditController
{
public:
    MusicTheoryController() = default;
    ~MusicTheoryController() SMTG_OVERRIDE = default;

    static FUnknown* createInstance(void*) { return (IEditController*)new MusicTheoryController(); }

    tresult PLUGIN_API initialize(FUnknown* context) SMTG_OVERRIDE;
    tresult PLUGIN_API terminate() SMTG_OVERRIDE;

    tresult PLUGIN_API setComponentState(IBStream* state) SMTG_OVERRIDE;

    // CreateView can return nullptr to indicate no custom GUI
    IPlugView* PLUGIN_API createView(FIDString name) SMTG_OVERRIDE;
};
