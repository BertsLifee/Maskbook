import urlcat from 'urlcat'
import { compact, uniqWith } from 'lodash-es'
import type { Web3Helper } from '@masknet/web3-helpers'
import {
    SearchResult,
    SearchResultType,
    DomainResult,
    FungibleTokenResult,
    NonFungibleTokenResult,
    SourceType,
    NonFungibleCollectionResult,
    EOAResult,
    attemptUntil,
    isSameAddress,
} from '@masknet/web3-shared-base'
import { EMPTY_LIST, NetworkPluginID } from '@masknet/shared-base'
import {
    ChainId as ChainIdEVM,
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
import { fetchJSON } from '../helpers/fetchJSON.js'
import { CoinGeckoSearchAPI } from '../CoinGecko/apis/DSearchAPI.js'
import { CoinMarketCapSearchAPI } from '../CoinMarketCap/DSearchAPI.js'
import { NFTScanSearchAPI, NFTScanCollectionSearchAPI } from '../NFTScan/index.js'
import type { DSearchBaseAPI } from '../types/DSearch.js'
import { getHandlers } from './rules.js'
import { DSEARCH_BASE_URL } from './constants.js'
import { fetchCached } from '../entry-helpers.js'
import { ChainbaseDomainAPI } from '../Chainbase/index.js'
import { SpaceID_API } from '../SpaceID/index.js'
import { ENS_API } from '../ENS/index.js'
import { CoinGeckoTrending_API } from '../CoinGecko/apis/CoinGecko.js'

const CoinGeckoTrending = new CoinGeckoTrending_API()
const ENS = new ENS_API()
const SpaceID = new SpaceID_API()
const ChainbaseDomain = new ChainbaseDomainAPI()

const isValidAddress = (address?: string): boolean => {
    return isValidAddressEVM(address) || isValidAddressFlow(address) || isValidAddressSolana(address)
}

const isZeroAddress = (address?: string): boolean => {
    return isZeroAddressEVM(address) || isZeroAddressFlow(address) || isZeroAddressSolana(address)
}

const isValidDomain = (domain?: string): boolean => {
    return isValidDomainEVM(domain) || isValidDomainFlow(domain) || isValidDomainSolana(domain)
}

export class DSearchAPI<ChainId = Web3Helper.ChainIdAll, SchemaType = Web3Helper.SchemaTypeAll>
    implements DSearchBaseAPI.Provider<ChainId, SchemaType, NetworkPluginID>
{
    private NFTScanClient = new NFTScanSearchAPI<ChainId, SchemaType>()
    private NFTScanCollectionClient = new NFTScanCollectionSearchAPI<ChainId, SchemaType>()
    private CoinGeckoClient = new CoinGeckoSearchAPI<ChainId, SchemaType>()
    private CoinMarketCapClient = new CoinMarketCapSearchAPI<ChainId, SchemaType>()

    private parseKeyword(keyword: string): { word: string; field?: string } {
        const words = keyword.split(':')
        if (words.length === 1) {
            return {
                word: words[0],
            }
        }
        return {
            word: words[1],
            field: words[0],
        }
    }

    private async searchDomain(domain: string): Promise<Array<DomainResult<ChainId>>> {
        // only EVM domains
        if (!isValidDomainEVM(domain)) return EMPTY_LIST

        const [address, chainId] = await attemptUntil(
            [
                () => ENS.lookup(ChainIdEVM.Mainnet, domain).then((x = '') => [x, ChainIdEVM.Mainnet]),
                () => ChainbaseDomain.lookup(ChainIdEVM.Mainnet, domain).then((x = '') => [x, ChainIdEVM.Mainnet]),
                () => SpaceID.lookup(ChainIdEVM.BSC, domain).then((x = '') => [x, ChainIdEVM.BSC]),
            ],
            ['', ChainIdEVM.Mainnet],
        )
        if (!isValidAddressEVM(address)) return EMPTY_LIST

        return [
            {
                type: SearchResultType.Domain,
                pluginID: NetworkPluginID.PLUGIN_EVM,
                chainId: chainId as ChainId,
                keyword: domain,
                domain,
                address,
            },
        ]
    }

    private async searchAddress(address: string): Promise<Array<EOAResult<ChainId>>> {
        // only EVM address
        if (!isValidAddressEVM(address)) return EMPTY_LIST

        const [domain, chainId] = await attemptUntil(
            [
                () => ENS.reverse(ChainIdEVM.Mainnet, address).then((x) => [x, ChainIdEVM.Mainnet]),
                () => ChainbaseDomain.reverse(ChainIdEVM.Mainnet, address).then((x) => [x, ChainIdEVM.Mainnet]),
                () => SpaceID.reverse(ChainIdEVM.BSC, address).then((x) => [x, ChainIdEVM.BSC]),
            ],
            ['', ChainIdEVM.Mainnet],
        )

        if (!isValidDomainEVM(domain)) return EMPTY_LIST

        return [
            {
                type: SearchResultType.EOA,
                pluginID: NetworkPluginID.PLUGIN_EVM,
                chainId: chainId as ChainId,
                keyword: address,
                domain,
                address,
            },
        ]
    }

    private async searchTokens() {
        const specificTokens = (
            await Promise.allSettled([
                fetchJSON<Array<FungibleTokenResult<ChainId, SchemaType>>>(
                    urlcat(DSEARCH_BASE_URL, '/fungible-tokens/specific-list.json'),
                    undefined,
                    fetchCached,
                ),
                fetchJSON<Array<NonFungibleTokenResult<ChainId, SchemaType>>>(
                    urlcat(DSEARCH_BASE_URL, '/non-fungible-tokens/specific-list.json'),
                    undefined,
                    fetchCached,
                ),
                fetchJSON<Array<NonFungibleCollectionResult<ChainId, SchemaType>>>(
                    urlcat(DSEARCH_BASE_URL, '/non-fungible-collections/specific-list.json'),
                    undefined,
                    fetchCached,
                ),
            ])
        )
            .map((v) => (v.status === 'fulfilled' && v.value ? v.value : []))
            .flat()

        const normalTokens = (
            await Promise.allSettled([
                this.NFTScanClient.get(),
                this.CoinGeckoClient.get(),
                this.CoinMarketCapClient.get(),
            ])
        )
            .map((v) => (v.status === 'fulfilled' && v.value ? v.value : []))
            .flat()

        return {
            specificTokens: compact<
                | FungibleTokenResult<ChainId, SchemaType>
                | NonFungibleTokenResult<ChainId, SchemaType>
                | NonFungibleCollectionResult<ChainId, SchemaType>
            >(
                specificTokens.map((x) =>
                    x.type === SearchResultType.FungibleToken ||
                    x.type === SearchResultType.NonFungibleToken ||
                    x.type === SearchResultType.NonFungibleCollection
                        ? x
                        : undefined,
                ),
            ),
            normalTokens: compact<
                | FungibleTokenResult<ChainId, SchemaType>
                | NonFungibleTokenResult<ChainId, SchemaType>
                | NonFungibleCollectionResult<ChainId, SchemaType>
            >(
                normalTokens.map((x) =>
                    x.type === SearchResultType.FungibleToken ||
                    x.type === SearchResultType.NonFungibleToken ||
                    x.type === SearchResultType.NonFungibleCollection
                        ? x
                        : undefined,
                ),
            ),
        }
    }

    private async searchTokenByAddress(address: string): Promise<Array<SearchResult<ChainId, SchemaType>>> {
        const { specificTokens, normalTokens } = await this.searchTokens()

        const specificTokensFiltered = specificTokens
            .filter(
                (x) =>
                    isSameAddress(address, x.address) &&
                    (x.type === SearchResultType.FungibleToken ||
                        x.type === SearchResultType.NonFungibleToken ||
                        x.type === SearchResultType.NonFungibleCollection),
            )
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

        const normalTokensFiltered = normalTokens
            .filter(
                (x) =>
                    isSameAddress(address, x.address) &&
                    (x.type === SearchResultType.FungibleToken ||
                        x.type === SearchResultType.NonFungibleToken ||
                        x.type === SearchResultType.NonFungibleCollection),
            )
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

        if (specificTokensFiltered.length > 0) return [specificTokensFiltered[0]]

        if (normalTokensFiltered.length > 0) return [normalTokensFiltered[0]]

        const coinInfo = await CoinGeckoTrending.getCoinInfoByAddress(address)

        if (coinInfo?.id) {
            return [
                {
                    type: SearchResultType.FungibleToken,
                    pluginID: NetworkPluginID.PLUGIN_EVM,
                    chainId: coinInfo.chainId as ChainId,
                    id: coinInfo.id,
                    source: SourceType.CoinGecko,
                    name: coinInfo.name,
                    // FIXME: symbol is missing
                    symbol: coinInfo.name,
                    keyword: address,
                },
            ]
        }
        return EMPTY_LIST
    }

    private async searchTokenByHandler(
        tokens: Array<
            | FungibleTokenResult<ChainId, SchemaType>
            | NonFungibleTokenResult<ChainId, SchemaType>
            | NonFungibleCollectionResult<ChainId, SchemaType>
        >,
        name: string,
    ): Promise<Array<SearchResult<ChainId, SchemaType>>> {
        let result: Array<
            | FungibleTokenResult<ChainId, SchemaType>
            | NonFungibleTokenResult<ChainId, SchemaType>
            | NonFungibleCollectionResult<ChainId, SchemaType>
        > = []

        for (const { rules, type } of getHandlers<ChainId, SchemaType>()) {
            for (const rule of rules) {
                if (!['token', 'twitter'].includes(rule.key)) continue

                const filtered = tokens.filter((x) => (type ? type === x.type : true))
                if (rule.type === 'exact') {
                    const item = filtered.find((x) => rule.filter?.(x, name, filtered))
                    if (item) result = [...result, { ...item, keyword: name }]
                }
                if (rule.type === 'fuzzy' && rule.fullSearch) {
                    const items = rule
                        .fullSearch<
                            | FungibleTokenResult<ChainId, SchemaType>
                            | NonFungibleTokenResult<ChainId, SchemaType>
                            | NonFungibleCollectionResult<ChainId, SchemaType>
                        >(name, filtered)
                        ?.map((x) => ({ ...x, keyword: name }))
                    if (items?.length) result = [...result, ...items]
                }
            }
        }
        return uniqWith(
            result,
            (a, b) => a.type === b.type && (a.id === b.id || isSameAddress(a.address, b.address) || a.rank === b.rank),
        ).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    }

    private async searchTokenByName(name: string): Promise<Array<SearchResult<ChainId, SchemaType>>> {
        const { specificTokens, normalTokens } = await this.searchTokens()

        const specificResult = await this.searchTokenByHandler(specificTokens, name)
        const normalResult = await this.searchTokenByHandler(normalTokens, name)

        if (specificResult.length > 0) return specificResult
        return normalResult
    }

    private async searchNonFungibleTokenByTwitterHandler(
        twitterHandler: string,
    ): Promise<Array<SearchResult<ChainId, SchemaType>>> {
        const collections = (await this.NFTScanCollectionClient.get())
            .filter((x) => x.collection?.socialLinks?.twitter?.toLowerCase() === twitterHandler.toLowerCase())
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

        if (!collections[0]) return EMPTY_LIST

        return [collections[0]]
    }

    /**
     * The entry point of DSearch
     * @param keyword
     * @returns
     */
    async search<T extends SearchResult<ChainId, SchemaType> = SearchResult<ChainId, SchemaType>>(
        keyword: string,
        type?: SearchResultType,
    ): Promise<T[]> {
        // #MASK or $MASK
        const [_, name = ''] = keyword.match(/[#$](\w+)/) ?? []
        if (name) return this.searchTokenByName(name) as Promise<T[]>

        // BoredApeYC or CryptoPunks nft twitter project
        if (type === SearchResultType.NonFungibleCollection)
            return this.searchNonFungibleTokenByTwitterHandler(keyword) as Promise<T[]>

        // token:MASK
        const { word, field } = this.parseKeyword(keyword)
        if (word && ['token', 'twitter'].includes(field ?? '')) return this.searchTokenByName(word) as Promise<T[]>

        // vitalik.eth
        if (isValidDomain(keyword)) return this.searchDomain(keyword) as Promise<T[]>

        // 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
        if (isValidAddress?.(keyword) && !isZeroAddress?.(keyword)) {
            const tokenList = await this.searchTokenByAddress(keyword)
            if (tokenList.length) return tokenList as T[]

            const addressList = await this.searchAddress(keyword)
            if (addressList.length) return addressList as T[]

            // TODO: query fungible token by coingecko
        }

        return EMPTY_LIST
    }
}