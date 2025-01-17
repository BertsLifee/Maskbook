import type { Subscription } from 'use-subscription'
import { getEnumAsArray } from '@masknet/kit'
import type { Plugin } from '@masknet/plugin-infra'
import { TransactionState } from '@masknet/web3-state'
import {
    ChainId,
    type Transaction as EVM_Transaction,
    formatEthereumAddress,
    isValidChainId,
} from '@masknet/web3-shared-evm'

export class Transaction extends TransactionState<ChainId, EVM_Transaction> {
    constructor(
        context: Plugin.Shared.SharedContext,
        subscriptions: {
            account?: Subscription<string>
            chainId?: Subscription<ChainId>
        },
    ) {
        super(
            context,
            getEnumAsArray(ChainId).map((x) => x.value),
            subscriptions,
            {
                formatAddress: formatEthereumAddress,
                isValidChainId,
            },
        )
    }
}
