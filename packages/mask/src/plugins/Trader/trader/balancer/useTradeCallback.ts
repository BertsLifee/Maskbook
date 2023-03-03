import { useAsyncFn } from 'react-use'
import type { ExchangeProxy } from '@masknet/web3-contracts/types/ExchangeProxy.js'
import { GasConfig, useTraderConstants, ContractTransaction } from '@masknet/web3-shared-evm'
import { useChainContext, useNetworkContext, useWeb3Connection, useWeb3State } from '@masknet/web3-hooks-base'
import { NetworkPluginID } from '@masknet/shared-base'
import { SLIPPAGE_DEFAULT } from '../../constants/index.js'
import { SwapResponse, TradeComputed, TradeStrategy } from '../../types/index.js'
import { useTradeAmount } from './useTradeAmount.js'
import { toHex } from 'web3-utils'
import { useSwapErrorCallback } from '../../SNSAdaptor/trader/hooks/useSwapErrorCallback.js'

export function useTradeCallback(
    trade: TradeComputed<SwapResponse> | null,
    exchangeProxyContract: ExchangeProxy | null,
    allowedSlippage = SLIPPAGE_DEFAULT,
    gasConfig?: GasConfig,
) {
    const notifyError = useSwapErrorCallback()
    const { account, chainId } = useChainContext()
    const { pluginID } = useNetworkContext()
    const { Others } = useWeb3State()
    const { BALANCER_ETH_ADDRESS } = useTraderConstants(chainId)
    const connection = useWeb3Connection()
    const tradeAmount = useTradeAmount(trade, allowedSlippage)

    return useAsyncFn(async () => {
        if (
            !connection ||
            !trade ||
            !trade.inputToken ||
            !trade.outputToken ||
            !exchangeProxyContract ||
            !BALANCER_ETH_ADDRESS ||
            pluginID !== NetworkPluginID.PLUGIN_EVM
        ) {
            return
        }

        const {
            swaps: [swaps],
        } = trade.trade_ as SwapResponse

        // cast the type to ignore the different type which was generated by typechain
        const swap_: Parameters<ExchangeProxy['methods']['multihopBatchSwapExactIn']>[0] = swaps.map((x) =>
            x.map(
                (y) =>
                    [
                        y.pool,
                        y.tokenIn,
                        y.tokenOut,
                        y.swapAmount,
                        y.limitReturnAmount,
                        y.maxPrice, // uint maxPrice
                    ] as [string, string, string, string, string, string],
            ),
        )

        // balancer use a different address for the native token
        const inputTokenAddress = Others?.isNativeTokenSchemaType(trade.inputToken.schema)
            ? BALANCER_ETH_ADDRESS
            : trade.inputToken.address
        const outputTokenAddress = Others?.isNativeTokenSchemaType(trade.outputToken.schema)
            ? BALANCER_ETH_ADDRESS
            : trade.outputToken.address

        // trade with the native token
        let transactionValue = '0'
        if (trade.strategy === TradeStrategy.ExactIn && Others?.isNativeTokenSchemaType(trade.inputToken.schema))
            transactionValue = trade.inputAmount.toFixed()
        else if (trade.strategy === TradeStrategy.ExactOut && Others?.isNativeTokenSchemaType(trade.outputToken.schema))
            transactionValue = trade.outputAmount.toFixed()

        try {
            // send transaction and wait for hash
            const tx = await new ContractTransaction(exchangeProxyContract).fillAll(
                trade.strategy === TradeStrategy.ExactIn
                    ? exchangeProxyContract.methods.multihopBatchSwapExactIn(
                          swap_,
                          inputTokenAddress,
                          outputTokenAddress,
                          trade.inputAmount.toFixed(),
                          tradeAmount.toFixed(),
                      )
                    : exchangeProxyContract.methods.multihopBatchSwapExactOut(
                          swap_,
                          inputTokenAddress,
                          outputTokenAddress,
                          tradeAmount.toFixed(),
                      ),
                {
                    from: account,
                    value: toHex(transactionValue),
                    ...gasConfig,
                },
            )
            // send transaction and wait for hash
            const hash = await connection.sendTransaction(tx, { chainId, overrides: { ...gasConfig } })
            const receipt = await connection.getTransactionReceipt(hash)
            return receipt?.transactionHash
        } catch (error) {
            if (error instanceof Error) {
                notifyError(error.message)
            }
            return
        }
    }, [
        chainId,
        trade,
        tradeAmount,
        exchangeProxyContract,
        BALANCER_ETH_ADDRESS,
        connection,
        pluginID,
        Others?.isNativeTokenSchemaType,
        notifyError,
    ])
}
