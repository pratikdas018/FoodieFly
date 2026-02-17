import React from "react"
import { Link } from "react-router-dom"
import { FiGithub, FiLinkedin, FiMail, FiMapPin, FiPhone } from "react-icons/fi"

function Footer() {
  const year = new Date().getFullYear()

  const quickLinks = [
    { label: "Home", to: "/" },
    { label: "My Orders", to: "/my-orders" },
    { label: "Favorites", to: "/favorites" },
    { label: "Profile", to: "/profile" }
  ]

  const companyLinks = [
    { label: "About Us", to: "/about-us" },
    { label: "Careers", to: "/careers" },
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms of Service", to: "/terms-of-service" }
  ]

  return (
    <footer className="relative w-full mt-12 border-t border-orange-100 bg-gradient-to-br from-[#fffaf7] via-white to-[#fff3eb] overflow-hidden">
      <div className="absolute -top-16 -left-10 h-44 w-44 rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Quick Links</h3>
            <div className="mt-4 flex flex-col gap-2.5">
              {quickLinks.map((link) => (
                <Link key={link.label} to={link.to} className="text-sm text-gray-600 hover:text-[#ff4d2d] transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://www.linkedin.com/in/pratik018/"
                target="_blank"
                rel="noreferrer"
                className="h-9 w-9 rounded-full border border-orange-200 bg-white text-[#ff4d2d] flex items-center justify-center hover:bg-orange-50 transition-colors"
                aria-label="LinkedIn"
              >
                <FiLinkedin />
              </a>
              <a
                href="https://github.com/pratikdas018"
                target="_blank"
                rel="noreferrer"
                className="h-9 w-9 rounded-full border border-orange-200 bg-white text-[#ff4d2d] flex items-center justify-center hover:bg-orange-50 transition-colors"
                aria-label="GitHub"
              >
                <FiGithub />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Company</h3>
            <div className="mt-4 flex flex-col gap-2.5">
              {companyLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`text-sm transition-colors ${link.label === "Privacy Policy" ? "text-[#ff4d2d] font-semibold" : "text-gray-600 hover:text-[#ff4d2d]"}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Contact Us</h3>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-gray-600">
              <p className="flex items-center gap-2"><FiMapPin className="text-[#ff4d2d]" /> Baruipur, Kolkata, WB 700144</p>
              <p className="flex items-center gap-2"><FiPhone className="text-[#ff4d2d]" /> +91 1800-123-456</p>
              <p className="flex items-center gap-2"><FiMail className="text-[#ff4d2d]" /> foodiefly.official@gmail.com</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Download App</h3>
            <div className="mt-4 flex flex-col gap-3">
              <button className="w-[170px] rounded-xl border border-orange-200 bg-white text-[#ff4d2d] text-sm font-semibold px-4 py-2 text-left hover:bg-orange-50 transition-colors">
                Download on the App Store
              </button>
              <button className="w-[170px] rounded-xl border border-orange-200 bg-white text-[#ff4d2d] text-sm font-semibold px-4 py-2 text-left hover:bg-orange-50 transition-colors">
                Get it on Google Play
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>FoodieFly (c) {year}. All rights reserved.</p>
          <p>FoodieFly connects you with trusted local restaurants for fast, fresh, and reliable delivery.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
