import { sendVisitAlertMail } from "../utils/mail.js"

const readClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"]
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
        return forwardedFor.split(",")[0].trim()
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return String(forwardedFor[0]).trim()
    }
    return req.ip || "unknown"
}

export const trackVisit = async (req, res) => {
    try {
        const page = String(req.body?.page || "/").slice(0, 300)
        const referrer = String(req.body?.referrer || "direct").slice(0, 400)
        const timezone = String(req.body?.timezone || "unknown").slice(0, 80)
        const screen = String(req.body?.screen || "unknown").slice(0, 50)
        const origin = req.get("origin") || "unknown"
        const userAgent = req.get("user-agent") || "unknown"
        const ip = readClientIp(req)

        await sendVisitAlertMail({
            page,
            referrer,
            timezone,
            screen,
            origin,
            userAgent,
            ip,
            visitedAt: new Date().toISOString()
        })

        return res.status(200).json({ message: "visit tracked" })
    } catch (error) {
        return res.status(500).json({ message: `track visit error ${error}` })
    }
}
