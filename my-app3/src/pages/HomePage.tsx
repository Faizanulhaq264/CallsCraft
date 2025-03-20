"use client"

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"

// Define the sections for our scrolling content
const sections = [
  {
    id: "hero",
    title: "Seamless Video Calls",
    subtitle: "Connect with clients effortlessly through our Zoom integration",
    image: "/placeholder.svg?height=600&width=800",
    imageAlt: "Video call interface",
    position: "right",
  },
  {
    id: "features",
    title: "Powerful Features",
    subtitle: "Everything you need to manage your client communications",
    image: "/placeholder.svg?height=600&width=800",
    imageAlt: "Dashboard features",
    position: "left",
  },
  {
    id: "analytics",
    title: "Detailed Analytics",
    subtitle: "Track your call history and performance metrics",
    image: "/placeholder.svg?height=600&width=800",
    imageAlt: "Analytics dashboard",
    position: "right",
  },
  {
    id: "security",
    title: "Enterprise Security",
    subtitle: "Your data is protected with end-to-end encryption",
    image: "/placeholder.svg?height=600&width=800",
    imageAlt: "Security features",
    position: "left",
  },
]

const HomePage = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState("hero")
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({})

  // Set up intersection observer to detect when sections are in view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-50% 0px",
      threshold: 0,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Observe all section elements
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        {/* Hero Section */}
        <section
          id="hero"
          ref={(el) => (sectionRefs.current["hero"] = el)}
          className="min-h-screen pt-20 flex flex-col justify-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-radial from-purple-900/10 to-transparent"></div>
          <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row items-center">
            <div
              className={`md:w-1/2 mb-8 md:mb-0 transition-all duration-1000 transform ${
                activeSection === "hero" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                Sales Video Meetings Made Simple
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Connect with your clients through seamless Zoom integration. Schedule, manage, and analyze your calls
                all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {currentUser ? (
                  <>
                    <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
                    <Button variant="secondary" onClick={() => navigate("/create-call")}>
                      Start a Call
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => navigate("/signup")}>Get Started</Button>
                    <Button variant="secondary" onClick={() => navigate("/login")}>
                      Log In
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div
              className={`md:w-1/2 transition-all duration-1000 transform ${
                activeSection === "hero" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
              }`}
            >
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg blur opacity-30"></div>
                <img
                  src="/placeholder.svg?height=600&width=800"
                  alt="Video call interface"
                  className="w-full h-auto rounded-lg relative z-10 border border-gray-800"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Scrolling Sections */}
        {sections.slice(1).map((section) => (
          <section
            key={section.id}
            id={section.id}
            ref={(el) => (sectionRefs.current[section.id] = el)}
            className="min-h-screen flex items-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-radial from-purple-900/10 to-transparent opacity-50"></div>
            <div className="container mx-auto px-4 py-12">
              <div
                className={`flex flex-col ${
                  section.position === "left" ? "md:flex-row" : "md:flex-row-reverse"
                } items-center`}
              >
                <div
                  className={`md:w-1/2 mb-8 md:mb-0 transition-all duration-1000 transform ${
                    activeSection === section.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                  }`}
                >
                  <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                    {section.title}
                  </h2>
                  <p className="text-xl text-gray-300 mb-8">{section.subtitle}</p>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center mt-1">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-white">Body and Attention metrics</h3>
                        <p className="mt-1 text-gray-400">Detect users body posture and track users face & eye gaze</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center mt-1">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-white">Live transcription and analysis</h3>
                        <p className="mt-1 text-gray-400">Transcribe client and sales representative speech during Zoom calls</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center mt-1">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-white">Automated checklist</h3>
                        <p className="mt-1 text-gray-400">Automates the agenda checklist of user</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center mt-1">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-white">Real-time Facial Analysis</h3>
                        <p className="mt-1 text-gray-400">Use AI to analyze facial expressions in real-time, determining the dominant emotion.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`md:w-1/2 transition-all duration-1000 transform ${
                    activeSection === section.id
                      ? "opacity-100 translate-x-0"
                      : section.position === "left"
                        ? "opacity-0 translate-x-10"
                        : "opacity-0 translate-x-[-10px]"
                  }`}
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg blur opacity-30"></div>
                    <img
                      src={section.image || "/placeholder.svg"}
                      alt={section.imageAlt}
                      className="w-full h-auto rounded-lg relative z-10 border border-gray-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black to-purple-900/20"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
              Ready to Transform Your Client Calls?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join our fleet full of professionals who use CallsCraft to manage their client communications efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentUser ? (
                <Button onClick={() => navigate("/create-call")} className="px-8 py-4 text-lg">
                  Start a Call Now
                </Button>
              ) : (
                <Button onClick={() => navigate("/signup")} className="px-8 py-4 text-lg">
                  Get Started for Free
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black border-t border-gray-800 py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="mb-8 md:mb-0">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  CallsCraft
                </h3>
                <p className="text-gray-400 max-w-md">
                  Professional video calling platform with Zoom integration for seamless client communications.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="text-white font-medium mb-4">Product</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Integrations
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-4">Resources</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Documentation
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Tutorials
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Blog
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-4">Company</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        About
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Careers
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-400 hover:text-white">
                        Contact
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 mb-4 md:mb-0">
                &copy; {new Date().getFullYear()} CallsCraft. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-white">
                  Terms
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  Privacy
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  Cookies
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  )
}

export default HomePage

