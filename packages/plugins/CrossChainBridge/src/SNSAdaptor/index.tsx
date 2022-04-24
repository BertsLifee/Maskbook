import type { Plugin } from '@masknet/plugin-infra'
import { ApplicationEntry } from '@masknet/shared'
import { CrossBridgeIcon } from '@masknet/icons'
import { PluginI18NFieldRender } from '@masknet/plugin-infra/content-script'
import { base } from '../base'
import { useState } from 'react'
import { CrossChainBridgeDialog } from './CrossChainBridgeDialog'

const sns: Plugin.SNSAdaptor.Definition = {
    ...base,
    init(signal, context) {},
    ApplicationEntries: [
        (() => {
            const icon = <CrossBridgeIcon />
            const name = { i18nKey: '__plugin_name', fallback: 'Cross-bridge' }
            return {
                ApplicationEntryID: base.ID,
                RenderEntryComponent({ disabled }) {
                    const [open, setOpen] = useState(false)
                    return (
                        <>
                            <ApplicationEntry
                                title={<PluginI18NFieldRender field={name} pluginID={base.ID} />}
                                disabled={disabled}
                                icon={icon}
                                onClick={() => setOpen(true)}
                            />
                            <CrossChainBridgeDialog open={open} onClose={() => setOpen(false)} />
                        </>
                    )
                },
                appBoardSortingDefaultPriority: 5,
                name,
                icon,
            }
        })(),
    ],
}

export default sns