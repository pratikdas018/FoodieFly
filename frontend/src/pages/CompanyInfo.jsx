import React from "react"
import { IoIosArrowRoundBack } from "react-icons/io"
import { useNavigate } from "react-router-dom"

const contentByType = {
  about: {
    title: "About Us",
    intro: "FoodieFly is a local-first food delivery platform built to make ordering simple, fast, and reliable.",
    points: [
      "We connect customers with nearby restaurants and verified delivery partners.",
      "Our goal is to reduce delivery wait times while keeping food quality high.",
      "We focus on transparent tracking, fair pricing, and better repeat-order experience."
    ]
  },
  careers: {
    title: "Careers",
    intro: "We are building the next generation of food delivery experiences and always looking for strong talent.",
    points: [
      "Open roles include frontend, backend, operations, support, and growth.",
      "We value ownership, speed, and product thinking.",
      "Share your profile at foodiefly.official@gmail.com with subject: Careers - Role Name."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    intro: "Your privacy matters at FoodieFly. We collect only the data needed to serve and improve your orders.",
    points: [
      "We use your location only for delivery discovery, routing, and order tracking.",
      "We never sell your personal data to third parties.",
      "You can request profile updates or account deletion by contacting support."
    ]
  },
  terms: {
    title: "Terms of Service",
    intro: "By using FoodieFly, you agree to follow platform policies for ordering, delivery, and account usage.",
    points: [
      "Orders are confirmed only after successful placement and acceptance by restaurant.",
      "Refund eligibility depends on cancellation stage, delivery status, and support review.",
      "Abusive activity, fraudulent orders, or policy violations may lead to account restriction."
    ]
  }
}

function CompanyInfo({ type = "about" }) {
  const navigate = useNavigate()
  const content = contentByType[type] || contentByType.about

  return (
    <div className="w-full min-h-screen bg-[#fff9f6] flex justify-center px-4 py-5">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-[12px] mb-6">
          <button className="z-[10] cursor-pointer" onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className="text-[#ff4d2d]" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{content.title}</h1>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-7 shadow-sm">
          <p className="text-gray-700 leading-7">{content.intro}</p>
          <div className="mt-5 flex flex-col gap-3">
            {content.points.map((point, index) => (
              <p key={`${type}_${index}`} className="text-gray-600 leading-7">
                {index + 1}. {point}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyInfo
