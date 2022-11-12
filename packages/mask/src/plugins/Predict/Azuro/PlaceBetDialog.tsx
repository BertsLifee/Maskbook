import { InjectedDialog, TokenAmountPanel, useOpenShareTxDialog } from '@masknet/shared'
import { Card, CardContent, DialogContent, Typography, Grid, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { makeStyles, ActionButton } from '@masknet/theme'
import { useI18N } from '../locales'
import { useI18N as useBaseI18N } from '../../../utils'
import { isGreaterThan, rightShift, isZero, NetworkPluginID } from '@masknet/web3-shared-base'
import {
    useFungibleToken,
    useFungibleTokenBalance,
    useAccount,
    useChainId,
    useWeb3Connection,
} from '@masknet/plugin-infra/web3'
import { useState, useMemo, useCallback } from 'react'
import { WalletConnectedBoundary } from '../../../web3/UI/WalletConnectedBoundary'
// import ActionButton from '../../../extension/options-page/DashboardComponents/ActionButton'
import { marketRegistry, outcomeRegistry, outcomeSecondParam } from './helpers'
import { usePlaceBetCallback, useActualRate } from './hooks'
import { activatedSocialNetworkUI } from '../../../social-network'
import { isTwitter } from '../../../social-network-adaptor/twitter.com/base'
import { isFacebook } from '../../../social-network-adaptor/facebook.com/base'
import { PickContext } from './context/usePickContext'
import { useContainer } from 'unstated-next'
import { Markets } from './types'
import { useAzuroLPContract } from './hooks/useAzuroContract'

const useStyles = makeStyles()((theme) => ({
    root: {
        fontFamily: 'Muli,Helvetica,-apple-system,system-ui,"sans-serif"',
        width: '100%',
        boxShadow: 'none',
        border: `solid 1px ${theme.palette.divider}`,
        padding: 0,
    },
    content: {
        width: '100%',
        height: 'var(--contentHeight)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        padding: '0 !important',
    },
    walletStatusBox: { margin: theme.spacing(1, 1, 3, 1) },
    container: { padding: theme.spacing(1) },
    infosContainer: {
        padding: theme.spacing(1.75, 0.75, 0.75, 0.75),
        gap: theme.spacing(0.5),
    },
    infoContainer: {
        minHeight: 30,
    },
    infoTitle: {
        fontWeight: '300',
    },
    actionButton: {
        flexDirection: 'column',
        position: 'relative',
        marginTop: theme.spacing(1.5),
        lineHeight: '22px',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '13px 0',
        fontSize: 18,
    },
}))

export function PlaceBetDialog() {
    const {
        openPlaceBetDialog: open,
        onClosePlaceBetDialog,
        conditionPick: condition,
        setConditionPick,
        gamePick: game,
        setGamePick,
    } = useContainer(PickContext)

    const onCloseDialog = useCallback(() => {
        setConditionPick(null)
        setGamePick(null)
        onClosePlaceBetDialog()
    }, [])

    const { t: tr } = useBaseI18N()
    const t = useI18N()
    const { classes } = useStyles()
    const [amount, setAmount] = useState('')
    const [slippage, setSlippage] = useState(2)
    const { value: token } = useFungibleToken(NetworkPluginID.PLUGIN_EVM)
    const { value: balance } = useFungibleTokenBalance(NetworkPluginID.PLUGIN_EVM, token?.address)
    const RATE_DECIMALS = 18
    const MINRATE_DECIMALS = 9

    const { value: actualRate, loading: actualRateLoading } = useActualRate(condition, amount)
    const rawAmount = rightShift(String(amount), token?.decimals)
    const deadline = Math.floor(Date.now() / 1000) + 2000
    const minRate = (1 + (((actualRate ?? 0) - 1) * (100 - slippage)) / 100).toFixed(8)
    const rawMinRate = rightShift(minRate ?? '0', MINRATE_DECIMALS)

    const [{ loading: isPlacing, error }, placeBetCallback] = usePlaceBetCallback(
        condition?.conditionId,
        rawAmount,
        condition?.outcomeId,
        deadline,
        rawMinRate,
    )

    const validationMessage = useMemo(() => {
        if (isZero(amount) || !amount) return t.plugin_enter_an_amount()
        if (isGreaterThan(rightShift(amount ?? 0, token?.decimals ?? 0), balance ?? 0))
            return t.plugin_insufficient_amount()

        return ''
    }, [amount, balance, token?.decimals, t])

    const handleSlippage = (event: React.MouseEvent<HTMLElement>, newSlippage: number) => setSlippage(newSlippage)
    const shareText = useMemo(() => {
        const isOnTwitter = isTwitter(activatedSocialNetworkUI)
        const isOnFacebook = isFacebook(activatedSocialNetworkUI)
        return isOnTwitter || isOnFacebook
            ? t.plugin_share({ account: isOnTwitter ? tr('twitter_account') : tr('facebook_account') })
            : t.plugin_share_no_official_account()
    }, [activatedSocialNetworkUI])

    const openShareTxDialog = useOpenShareTxDialog()
    const placeBet = useCallback(async () => {
        const hash = await placeBetCallback()

        if (typeof hash !== 'string') return
        await openShareTxDialog({
            hash,
            onShare() {
                activatedSocialNetworkUI.utils.share?.(shareText)
            },
        })
    }, [placeBetCallback, openShareTxDialog])
    const account = useAccount(NetworkPluginID.PLUGIN_EVM)
    const chainId = useChainId(NetworkPluginID.PLUGIN_EVM)
    const azuroContract = useAzuroLPContract()
    const connection = useWeb3Connection(NetworkPluginID.PLUGIN_EVM)

    if (!open) return null

    return (
        <Card className={classes.root}>
            <CardContent className={classes.content}>
                <InjectedDialog open={open} title={t.plugin_place_bet()} onClose={onCloseDialog}>
                    <DialogContent>
                        <div className={classes.container}>
                            <TokenAmountPanel
                                label={t.plugin_amount()}
                                amount={amount}
                                balance={balance ?? '0'}
                                token={token}
                                onAmountChange={(amount: string) => setAmount(amount)}
                            />
                            <Grid container className={classes.infosContainer}>
                                <Grid className={classes.infoContainer} container justifyContent="space-between">
                                    <Typography className={classes.infoTitle}>Event:</Typography>
                                    <Typography>
                                        {`${game?.participants[0].name} ${t.plugin_versus()} ${
                                            game?.participants[1].name
                                        }`}
                                    </Typography>
                                </Grid>
                                <Grid className={classes.infoContainer} container justifyContent="space-between">
                                    <Typography className={classes.infoTitle}>Market:</Typography>
                                    <Typography>{game ? marketRegistry[game.marketRegistryId] : null}</Typography>
                                </Grid>
                                <Grid className={classes.infoContainer} container justifyContent="space-between">
                                    <Typography className={classes.infoTitle}>Outcome:</Typography>
                                    <Typography>
                                        {condition && game ? outcomeRegistry[condition.outcomeRegistryId](game) : null}
                                        &nbsp;
                                        {game?.marketRegistryId === Markets.TotalGoals
                                            ? outcomeSecondParam[condition?.paramId ?? 0].value
                                            : game?.marketRegistryId === Markets.Handicap
                                            ? outcomeSecondParam[condition?.paramId ?? 0].value
                                            : null}
                                    </Typography>
                                </Grid>
                                <Grid className={classes.infoContainer} container justifyContent="space-between">
                                    <Typography className={classes.infoTitle}>Odds:</Typography>
                                    <Typography>
                                        {!amount ? (
                                            condition?.value
                                        ) : actualRateLoading ? (
                                            <div>{tr('loading')}</div>
                                        ) : (
                                            actualRate
                                        )}
                                    </Typography>
                                </Grid>
                                <Grid className={classes.infoContainer} container justifyContent="space-between">
                                    <Typography className={classes.infoTitle}>Min odds:</Typography>
                                    <Typography>
                                        {!amount ? (
                                            condition?.value.toFixed(2)
                                        ) : actualRateLoading ? (
                                            <div>{tr('loading')}</div>
                                        ) : (
                                            minRate
                                        )}
                                    </Typography>
                                </Grid>
                                <Grid
                                    container
                                    justifyContent="space-between"
                                    alignItems="center"
                                    className={classes.infoContainer}>
                                    <Typography className={classes.infoTitle}>Slippage:</Typography>
                                    <Typography>
                                        <ToggleButtonGroup value={slippage} exclusive onChange={handleSlippage}>
                                            <ToggleButton value={2}>2%</ToggleButton>
                                            <ToggleButton value={3}>3%</ToggleButton>
                                            <ToggleButton value={10}>10%</ToggleButton>
                                        </ToggleButtonGroup>
                                    </Typography>
                                </Grid>
                            </Grid>
                            <WalletConnectedBoundary>
                                <ActionButton
                                    className={classes.actionButton}
                                    size="large"
                                    variant="contained"
                                    disabled={isPlacing || !!validationMessage}
                                    onClick={placeBet}
                                    fullWidth>
                                    {isPlacing ? tr('loading') : validationMessage || t.plugin_place_bet()}
                                </ActionButton>
                            </WalletConnectedBoundary>
                        </div>
                    </DialogContent>
                </InjectedDialog>
            </CardContent>
        </Card>
    )
}
