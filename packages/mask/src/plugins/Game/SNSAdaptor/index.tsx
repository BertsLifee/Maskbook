import { Icons } from '@masknet/icons'
import type { Plugin } from '@masknet/plugin-infra'
import { ApplicationEntry } from '@masknet/shared'
import { useRemoteControlledDialog } from '@masknet/shared-base-ui'
import { Trans } from 'react-i18next'
import { base } from '../base'
import { PluginGameMessages } from '../messages'
import WalletConnectDialog, { ConnectContext } from './WalletConnectDialog'

const sns: Plugin.SNSAdaptor.Definition = {
    ...base,
    init() {},
    GlobalInjection() {
        return (
            <ConnectContext.Provider>
                <WalletConnectDialog />
            </ConnectContext.Provider>
        )
    },
    ApplicationEntries: [
        (() => {
            const icon = <Icons.Game size={36} />
            const name = <Trans i18nKey="plugin_game_name" />
            return {
                ApplicationEntryID: base.ID,
                RenderEntryComponent({ disabled, ...props }) {
                    const { openDialog } = useRemoteControlledDialog(PluginGameMessages.events.gameDialogUpdated)

                    return (
                        <ApplicationEntry
                            {...props}
                            disabled
                            title={name}
                            icon={icon}
                            onClick={props.onClick ? () => props.onClick?.(openDialog) : openDialog}
                        />
                    )
                },
                appBoardSortingDefaultPriority: 16,
                marketListSortingPriority: 12,
                icon,
                description: <Trans i18nKey="plugin_game_description" />,
                name,
                tutorialLink: 'https://twitter.com/NonFFriend',
                category: 'dapp',
            }
        })(),
    ],
}

export default sns
