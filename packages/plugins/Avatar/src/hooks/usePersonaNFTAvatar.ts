import LRU from 'lru-cache'
import { useAsyncRetry } from 'react-use'
import { type EnhanceableSite, NetworkPluginID, getEnhanceableSiteType, getSiteType } from '@masknet/shared-base'
import type { RSS3_KEY_SNS } from '../constants.js'
import type { AvatarMetaDB, NextIDAvatarMeta } from '../types.js'
import { useGetNFTAvatar } from './useGetNFTAvatar.js'
import { getNFTAvatarByUserId } from '../utils/index.js'
import { ChainId } from '@masknet/web3-shared-evm'

const cache = new LRU<string, NextIDAvatarMeta>({
    max: 500,
    ttl: 60 * 1000,
})

type GetNFTAvatar = (
    userId?: string,
    network?: EnhanceableSite,
    snsKey?: RSS3_KEY_SNS,
) => Promise<AvatarMetaDB | undefined>

export function usePersonaNFTAvatar(userId: string, avatarId: string, persona: string, snsKey: RSS3_KEY_SNS) {
    const getNFTAvatar = useGetNFTAvatar()

    return useAsyncRetry(async () => {
        if (!userId) return
        const key = `${userId}-${getSiteType()}`
        if (!cache.has(key)) {
            const nftAvatar = await getNFTAvatarForCache(userId, snsKey, avatarId, persona, getNFTAvatar)
            if (nftAvatar) cache.set(key, nftAvatar)
        }
        return cache.get(key)
    }, [userId, persona, snsKey, getNFTAvatar, avatarId])
}

async function getNFTAvatarForCache(
    userId: string,
    snsKey: RSS3_KEY_SNS,
    avatarId: string,
    persona: string,
    fn: GetNFTAvatar,
) {
    const avatarMetaFromPersona = await getNFTAvatarByUserId(userId, avatarId, persona)
    if (avatarMetaFromPersona) return avatarMetaFromPersona
    const siteType = getEnhanceableSiteType()
    if (!siteType) return
    const avatarMeta = await fn(userId, siteType, snsKey)
    if (!avatarMeta) return
    if (avatarId && avatarId !== avatarMeta.avatarId) return
    if (avatarMeta.pluginId === NetworkPluginID.PLUGIN_SOLANA) {
        return { imageUrl: '', nickname: '', ...avatarMeta, address: avatarMeta.tokenId }
    }
    return { imageUrl: '', nickname: '', pluginId: NetworkPluginID.PLUGIN_EVM, chainId: ChainId.Mainnet, ...avatarMeta }
}