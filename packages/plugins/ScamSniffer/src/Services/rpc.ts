import { R2D2KeyValue } from '@masknet/web3-providers'
import { PLUGIN_ID } from '../constants.js'
import type { ScamResult, PostDetail } from '@scamsniffer/detector'
import { reportScam, Detector } from '@scamsniffer/detector'

const storage = R2D2KeyValue.createJSON_Storage(PLUGIN_ID)
const reportKey = 'auto_report'

let detector: Detector | null = null

function initDetector() {
    if (detector === null) {
        detector = new Detector({
            onlyBuiltIn: false,
        })
    }
}

export async function enableAutoReport(enabled: boolean) {
    await storage.set(reportKey, enabled ? 1 : 0)
}

export async function isAutoReportEnabled(): Promise<boolean> {
    try {
        const state = await storage.get(reportKey)
        if (state === 1) return true
    } catch (error) {}
    return false
}

export async function sendReportScam(result: ScamResult) {
    return reportScam(result)
}

export async function detectScam(post: PostDetail) {
    initDetector()
    await detector?.update()
    const result = await detector?.detectScam(post)
    return result
}
