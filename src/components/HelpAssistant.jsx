import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send, Sparkles } from "lucide-react"

/**
 * Scripted support assistant.
 *
 * Deliberately NOT a language model. The questions a secondhand store actually
 * gets are a short, closed list — where is my order, how do returns work, do things
 * run big — and a keyword-matched answer is instant, free, and can never invent a
 * refund policy that doesn't exist. That last point is the real argument: a made-up
 * answer about money is worse than no answer.
 *
 * `answerFor` is the single seam. Swapping it for an async call to a real model
 * later means changing one function, not this component.
 */

const KNOWLEDGE = [
  {
    id: "returns",
    keywords: ["return", "refund", "send back", "money back", "returning"],
    chips: ["How do returns work?"],
    answer:
      "You can return anything within 14 days of delivery. Open Your orders, find the piece and hit Return — pick a reason, choose refund or exchange, and you'll get a reference number to track it.",
  },
  {
    id: "exchange",
    keywords: ["exchange", "swap", "different size", "another size"],
    chips: ["Can I exchange for another size?"],
    answer:
      "Not for the same piece, and this is the one place we differ from a normal shop: every item here is one-of-one, so there is no second copy in another size. An exchange gives you credit to pick anything else in the vault instead.",
  },
  {
    id: "tracking",
    keywords: ["track", "where is", "delivery", "shipping", "arrive", "dispatch", "how long"],
    chips: ["Where's my order?"],
    answer:
      "Every order has a tracking strip under Your orders showing Paid → Shipped → Delivered. Most orders leave us within two working days.",
  },
  {
    id: "sizing",
    keywords: ["size", "sizing", "fit", "run big", "run small", "measurement"],
    chips: ["Will it fit me?"],
    answer:
      "Ignore the label and read the measurements — every product page has a spec table with flat measurements and the fit described in words. Vintage sizing drifts a lot by decade, so the numbers are the only reliable guide.",
  },
  {
    id: "condition",
    keywords: ["condition", "flaw", "damage", "quality", "worn", "used"],
    chips: ["What condition are pieces in?"],
    answer:
      "Every listing carries a condition grade and a Flaws line where we spell out any wear or damage. We would rather put you off than surprise you — if it isn't mentioned, we didn't find it.",
  },
  {
    id: "payment",
    keywords: ["payment", "pay", "card", "upi", "checkout", "billing"],
    chips: [],
    answer:
      "Please don't pay. The UPI code at checkout is a real one, so scanning it moves actual money out of your account — but this is a demo store and nothing is ever delivered. Card and cash on delivery are simulated and charge you nothing. Your account, the stock and the orders are all real.",
  },
  {
    id: "stock",
    keywords: ["one of one", "stock", "sold out", "unique", "restock", "more"],
    chips: [],
    answer:
      "Every piece is a single physical garment, so once it sells it's gone — there's no restock. If something is in your bag it's held for you for 15 minutes at checkout.",
  },
]

const FALLBACK =
  "I can help with returns, exchanges, delivery, sizing, condition and payment. For anything else, drop us a line at help@thriftvault.test and a human will pick it up."

const GREETING =
  "Hi! I can help with returns, exchanges, delivery and sizing. What do you need?"

/** The seam: question in, answer out. Swap this for a model call when you want one. */
function answerFor(question) {
  const q = question.toLowerCase()
  let best = null
  let bestScore = 0
  for (const entry of KNOWLEDGE) {
    const score = entry.keywords.reduce((n, k) => (q.includes(k) ? n + 1 : n), 0)
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return best ? best.answer : FALLBACK
}

export default function HelpAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([{ from: "bot", text: GREETING }])
  const [isThinking, setThinking] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function ask(text) {
    const question = text.trim()
    if (!question) return
    setMessages((m) => [...m, { from: "user", text: question }])
    setInput("")
    setThinking(true)
    // A short pause so the reply doesn't appear before the question has visually
    // landed — instant answers read as canned even when they're correct.
    setTimeout(() => {
      setMessages((m) => [...m, { from: "bot", text: answerFor(question) }])
      setThinking(false)
    }, 450)
  }

  const suggestions = KNOWLEDGE.flatMap((k) => k.chips)

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open help assistant"
          className="fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-2 rounded-full bg-lime px-4 py-3 text-sm font-bold text-ink shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">Need help?</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-end sm:inset-auto sm:bottom-4 sm:right-4">
          <div className="flex h-[75vh] w-full flex-col rounded-t-2xl border border-line bg-surface sm:h-[520px] sm:w-[380px] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-lime/15 text-lime">
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Vault Help</p>
                  <p className="text-[11px] text-white/35">Returns, delivery &amp; sizing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close help assistant"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-line text-white/50 hover:border-lime hover:text-lime"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <p
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.from === "user"
                        ? "rounded-br-sm bg-lime text-ink"
                        : "rounded-bl-sm bg-surface2 text-white/85"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start">
                  <p className="flex gap-1 rounded-2xl rounded-bl-sm bg-surface2 px-3.5 py-3">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </p>
                </div>
              )}

              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-lime hover:text-lime"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
              className="flex items-center gap-2 border-t border-line px-3 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about returns, delivery…"
                className="min-w-0 flex-1 rounded-full border border-line bg-surface2 px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-lime"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim()}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-lime text-ink disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
