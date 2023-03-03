/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from 'bn.js'
import { ContractOptions } from 'web3-eth-contract'
import { EventLog } from 'web3-core'
import { EventEmitter } from 'events'
import {
    Callback,
    PayableTransactionObject,
    NonPayableTransactionObject,
    BlockType,
    ContractEventLog,
    BaseContract,
} from './types.js'

interface EventOptions {
    filter?: object
    fromBlock?: BlockType
    topics?: string[]
}

export type EntryPointChanged = ContractEventLog<{
    oldEntryPoint: string
    newEntryPoint: string
    0: string
    1: string
}>
export type Initialized = ContractEventLog<{
    version: string
    0: string
}>
export type OwnerChanged = ContractEventLog<{
    oldOwner: string
    newOwner: string
    0: string
    1: string
}>
export type PaymasterChanged = ContractEventLog<{
    oldPaymaster: string
    newPaymaster: string
    0: string
    1: string
}>

export interface Wallet extends BaseContract {
    constructor(jsonInterface: any[], address?: string, options?: ContractOptions): Wallet
    clone(): Wallet
    methods: {
        NAME(): NonPayableTransactionObject<string>

        VERSION(): NonPayableTransactionObject<string>

        addDeposit(): PayableTransactionObject<void>

        changeOwner(newOwner: string): NonPayableTransactionObject<void>

        changePaymaster(newPaymaster: string): NonPayableTransactionObject<void>

        entryPoint(): NonPayableTransactionObject<string>

        exec(dest: string, value: number | string | BN, func: string | number[]): NonPayableTransactionObject<void>

        execBatch(dest: string[], func: (string | number[])[]): NonPayableTransactionObject<void>

        execFromEntryPoint(
            dest: string,
            value: number | string | BN,
            func: string | number[],
        ): NonPayableTransactionObject<void>

        getDeposit(): NonPayableTransactionObject<string>

        initialize(
            _entryPointAddress: string,
            _owner: string,
            _gasToken: string,
            _approveFor: string,
            _amount: number | string | BN,
            _nativeTokenPaymaster: string,
        ): NonPayableTransactionObject<void>

        nativeTokenPaymaster(): NonPayableTransactionObject<string>

        nonce(): NonPayableTransactionObject<string>

        onERC1155BatchReceived(
            arg0: string,
            arg1: string,
            arg2: (number | string | BN)[],
            arg3: (number | string | BN)[],
            arg4: string | number[],
        ): NonPayableTransactionObject<string>

        onERC1155Received(
            arg0: string,
            arg1: string,
            arg2: number | string | BN,
            arg3: number | string | BN,
            arg4: string | number[],
        ): NonPayableTransactionObject<string>

        onERC721Received(
            arg0: string,
            arg1: string,
            arg2: number | string | BN,
            arg3: string | number[],
        ): NonPayableTransactionObject<string>

        owner(): NonPayableTransactionObject<string>

        supportsInterface(interfaceId: string | number[]): NonPayableTransactionObject<boolean>

        tokensReceived(
            arg0: string,
            arg1: string,
            arg2: string,
            arg3: number | string | BN,
            arg4: string | number[],
            arg5: string | number[],
        ): NonPayableTransactionObject<void>

        transfer(dest: string, amount: number | string | BN): NonPayableTransactionObject<void>

        updateEntryPoint(newEntryPoint: string): NonPayableTransactionObject<void>

        validateUserOp(
            userOp: [
                string,
                number | string | BN,
                string | number[],
                string | number[],
                number | string | BN,
                number | string | BN,
                number | string | BN,
                number | string | BN,
                number | string | BN,
                string,
                string | number[],
                string | number[],
            ],
            requestId: string | number[],
            missingWalletFunds: number | string | BN,
        ): NonPayableTransactionObject<void>

        withdrawDepositTo(withdrawAddress: string, amount: number | string | BN): NonPayableTransactionObject<void>
    }
    events: {
        EntryPointChanged(cb?: Callback<EntryPointChanged>): EventEmitter
        EntryPointChanged(options?: EventOptions, cb?: Callback<EntryPointChanged>): EventEmitter

        Initialized(cb?: Callback<Initialized>): EventEmitter
        Initialized(options?: EventOptions, cb?: Callback<Initialized>): EventEmitter

        OwnerChanged(cb?: Callback<OwnerChanged>): EventEmitter
        OwnerChanged(options?: EventOptions, cb?: Callback<OwnerChanged>): EventEmitter

        PaymasterChanged(cb?: Callback<PaymasterChanged>): EventEmitter
        PaymasterChanged(options?: EventOptions, cb?: Callback<PaymasterChanged>): EventEmitter

        allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter
    }

    once(event: 'EntryPointChanged', cb: Callback<EntryPointChanged>): void
    once(event: 'EntryPointChanged', options: EventOptions, cb: Callback<EntryPointChanged>): void

    once(event: 'Initialized', cb: Callback<Initialized>): void
    once(event: 'Initialized', options: EventOptions, cb: Callback<Initialized>): void

    once(event: 'OwnerChanged', cb: Callback<OwnerChanged>): void
    once(event: 'OwnerChanged', options: EventOptions, cb: Callback<OwnerChanged>): void

    once(event: 'PaymasterChanged', cb: Callback<PaymasterChanged>): void
    once(event: 'PaymasterChanged', options: EventOptions, cb: Callback<PaymasterChanged>): void
}
