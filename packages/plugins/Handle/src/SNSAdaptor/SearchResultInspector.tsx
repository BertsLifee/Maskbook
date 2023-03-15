import { useContext, useEffect } from 'react'
import { useCopyToClipboard } from 'react-use'
import { ChainId } from '@masknet/web3-shared-evm'
import { ScopedDomainsContainer, useWeb3State } from '@masknet/web3-hooks-base'
import { NetworkPluginID } from '@masknet/shared-base'
import { SocialAccountList, useSnackbarCallback } from '@masknet/shared'
import { Box, Typography, Link } from '@mui/material'
import { ENSProvider, ENSContext, SearchResultInspectorProps } from './context.js'
import { makeStyles } from '@masknet/theme'
import { Icons } from '@masknet/icons'
import { useI18N } from '../locales/index.js'
import { PluginHeader } from './PluginHeader.js'
import { SuffixToChainIconMap } from '../constants.js'

const useStyles = makeStyles()((theme) => {
    return {
        root: {
            padding: theme.spacing(0, 2),
        },
        ensInfo: {
            height: 42,
            display: 'flex',
            alignItems: 'center',
            marginBottom: 16,
        },
        ensIcon: {
            marginRight: 4,
        },
        domain: {
            fontWeight: 700,
            color: theme.palette.maskColor.publicMain,
            fontSize: 18,
            lineHeight: '18px',
        },
        reversedAddress: {
            display: 'flex',
            alignItems: 'center',
            color: theme.palette.maskColor.secondaryDark,
            fontSize: 14,
            lineHeight: '18px',
        },
        link: {
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none !important',
        },
        reversedAddressIcon: {
            marginRight: 2,
            marginBottom: 1,
            cursor: 'pointer',
            color: theme.palette.maskColor.secondaryDark,
        },
        accounts: {
            marginLeft: 'auto',
        },
    }
})

export function SearchResultInspectorContent() {
    const t = useI18N()
    const { classes } = useStyles()
    const { Others } = useWeb3State(NetworkPluginID.PLUGIN_EVM)
    const { reversedAddress, nextIdBindings, domain } = useContext(ENSContext)
    const [, copyToClipboard] = useCopyToClipboard()
    const copyWalletAddress = useSnackbarCallback({
        executor: async (address: string) => copyToClipboard(address),
        deps: [],
        successText: t.wallets_address_copied(),
    })
    const suffix = domain ? domain.split('.').pop()! : undefined
    const ChainIcon = suffix ? SuffixToChainIconMap[suffix] ?? Icons.ETH : null

    const { setPair } = ScopedDomainsContainer.useContainer()
    useEffect(() => {
        if (!reversedAddress || !domain) return
        setPair(reversedAddress, domain)
    }, [reversedAddress, domain])

    return (
        <>
            <PluginHeader />
            <Box className={classes.root}>
                <section className={classes.ensInfo}>
                    {domain && ChainIcon ? <ChainIcon size={30} className={classes.ensIcon} /> : null}
                    <div>
                        {domain ? <Typography className={classes.domain}>{domain}</Typography> : null}
                        {reversedAddress ? (
                            <Typography className={classes.reversedAddress}>
                                {reversedAddress}{' '}
                                <Icons.Copy
                                    size={20}
                                    className={classes.reversedAddressIcon}
                                    onClick={() => copyWalletAddress(reversedAddress ?? '')}
                                />
                                <Link
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={classes.link}
                                    href={
                                        Others?.explorerResolver.addressLink?.(ChainId.Mainnet, reversedAddress) ?? ''
                                    }>
                                    <Icons.LinkOut size={20} className={classes.reversedAddressIcon} />
                                </Link>
                            </Typography>
                        ) : null}
                    </div>
                    <SocialAccountList nextIdBindings={nextIdBindings} className={classes.accounts} />
                </section>
            </Box>
        </>
    )
}

export function SearchResultInspector(props: SearchResultInspectorProps) {
    return (
        <ENSProvider {...props}>
            <SearchResultInspectorContent />
        </ENSProvider>
    )
}
