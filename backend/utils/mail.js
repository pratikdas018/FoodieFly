import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()
const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

export const sendOtpMail=async (to,otp) => {
    await transporter.sendMail({
        from:process.env.EMAIL,
        to,
        subject:"Reset Your Password",
        html:`<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>`
    })
}


export const sendDeliveryOtpMail=async (user,otp) => {
    await transporter.sendMail({
        from:process.env.EMAIL,
        to:user.email,
        subject:"Delivery OTP",
        html:`<p>Your OTP for delivery is <b>${otp}</b>. It expires in 5 minutes.</p>`
    })
}

export const sendVisitAlertMail = async (payload = {}) => {
    const to = payload.to || process.env.ANALYTICS_EMAIL_TO || process.env.EMAIL
    const visitedAt = payload.visitedAt || new Date().toISOString()
    const origin = payload.origin || "unknown"
    const page = payload.page || "/"
    const ip = payload.ip || "unknown"
    const userAgent = payload.userAgent || "unknown"
    const referrer = payload.referrer || "direct"
    const timezone = payload.timezone || "unknown"
    const screen = payload.screen || "unknown"

    await transporter.sendMail({
        from: process.env.EMAIL,
        to,
        subject: "FoodieFly Visit Alert",
        html: `
            <h3>New Visit on FoodieFly</h3>
            <p><b>Time:</b> ${visitedAt}</p>
            <p><b>Origin:</b> ${origin}</p>
            <p><b>Page:</b> ${page}</p>
            <p><b>IP:</b> ${ip}</p>
            <p><b>User Agent:</b> ${userAgent}</p>
            <p><b>Referrer:</b> ${referrer}</p>
            <p><b>Timezone:</b> ${timezone}</p>
            <p><b>Screen:</b> ${screen}</p>
        `
    })
}
