import { NetworkPluginID } from '@masknet/shared-base'
import type { Web3Helper } from '@masknet/web3-helpers'
import {
    SearchResult,
    SearchResultType,
    DomainResult,
    FungibleTokenResult,
    SearchFungibleTokenResultSubType,
    EOAResult,
    attemptUntil,
} from '@masknet/web3-shared-base'
import {
    ChainId as ChainIdEVM,
    AddressType,
    isValidAddress as isValidAddressEVM,
    isZeroAddress as isZeroAddressEVM,
    isValidDomain as isValidDomainEVM,
} from '@masknet/web3-shared-evm'
import {
    isValidAddress as isValidAddressFlow,
    isZeroAddress as isZeroAddressFlow,
    isValidDomain as isValidDomainFlow,
} from '@masknet/web3-shared-flow'
import {
    isValidAddress as isValidAddressSolana,
    isZeroAddress as isZeroAddressSolana,
    isValidDomain as isValidDomainSolana,
} from '@masknet/web3-shared-solana'
import { ENS, SpaceID, ChainbaseDomain } from '../index.js'
import type { DSearchBaseAPI } from '../types/DSearch.js'

const CHAIN_ID_LIST = [ChainIdEVM.Mainnet, ChainIdEVM.BSC, ChainIdEVM.Matic]

const isValidAddress = (address?: string): boolean => {
    return isValidAddressEVM(address) || isValidAddressFlow(address) || isValidAddressSolana(address)
}

const isZeroAddress = (address?: string): boolean => {
    return isZeroAddressEVM(address) || isZeroAddressFlow(address) || isZeroAddressSolana(address)
}

const isValidDomain = (domain?: string): boolean => {
    return isValidDomainEVM(domain) || isValidDomainFlow(domain) || isValidDomainSolana(domain)
}

export class DSearchAPI<ChainId = Web3Helper.ChainIdAll> implements DSearchBaseAPI.Provider<ChainId, NetworkPluginID> {
    async search(
        keyword: string,
        options: {
            getAddressType?: (
                address: string,
                options?: Web3Helper.Web3ConnectionOptions<NetworkPluginID.PLUGIN_EVM>,
            ) => Promise<AddressType | undefined>
        },
    ): Promise<SearchResult<ChainId>> {
        const { getAddressType } = options
        const trendingTokenRegexResult = keyword.match(/([#$])(\w+)/) ?? []

        const [_, trendingSearchType, trendingTokenName = ''] = trendingTokenRegexResult

        if (trendingSearchType && trendingTokenName) {
            return {
                type: SearchResultType.FungibleToken,
                domain: keyword,
                subType: SearchFungibleTokenResultSubType.Keyword,
                trendingSearchType,
                name: trendingTokenName,
                keyword,
                pluginID: NetworkPluginID.PLUGIN_EVM,
            } as FungibleTokenResult<ChainId>
        }

        if (isValidDomain?.(keyword)) {
            const address = await attemptUntil(
                [ENS, ChainbaseDomain, SpaceID].map((x) => async () => {
                    return x.lookup(ChainIdEVM.Mainnet, keyword)
                }),
                '',
            )
            return {
                type: SearchResultType.Domain,
                domain: keyword,
                address,
                keyword,
                pluginID: NetworkPluginID.PLUGIN_EVM,
            } as DomainResult<ChainId>
        }

        if (isValidAddress?.(keyword) && !isZeroAddress?.(keyword)) {
            const addressType = await attemptUntil(
                CHAIN_ID_LIST.map((chainId) => async () => {
                    const addressType = await getAddressType?.(keyword, { chainId })
                    if (addressType !== AddressType.Contract) return
                    return addressType
                }),
                undefined,
            )

            if (addressType !== AddressType.Contract) {
                const domain = await attemptUntil(
                    [ENS, ChainbaseDomain, SpaceID].map((x) => async () => {
                        return x.reverse(ChainIdEVM.Mainnet, keyword)
                    }),
                    '',
                )
                return {
                    type: SearchResultType.EOA,
                    address: keyword,
                    domain,
                    keyword,
                    pluginID: NetworkPluginID.PLUGIN_EVM,
                } as EOAResult<ChainId>
            }
            return {
                pluginID: NetworkPluginID.PLUGIN_EVM,
                type: SearchResultType.FungibleToken,
                subType: SearchFungibleTokenResultSubType.Address,
                keyword,
            } as FungibleTokenResult<ChainId>
        }

        return {
            pluginID: NetworkPluginID.PLUGIN_EVM,
            type: SearchResultType.Unknown,
            keyword,
        }
    }
}
