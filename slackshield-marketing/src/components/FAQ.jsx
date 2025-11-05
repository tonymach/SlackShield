import { useState } from 'react'

/**
 * FAQ Section
 */
function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: 'How does SlackShield work?',
      answer: 'SlackShield connects to your Slack workspace and monitors incoming messages. When someone contacts you during your defined off-hours, it automatically sends a professional auto-response and logs the violation. You get full control over your schedule and response templates.'
    },
    {
      question: 'Will my coworkers know I\'m using SlackShield?',
      answer: 'Only if they message you during off-hours and receive the auto-response. The response is professional and clearly indicates you\'re unavailable. You can customize the message to match your communication style.'
    },
    {
      question: 'Can I set different schedules for different days?',
      answer: 'Absolutely! You can create custom schedules for weekdays, weekends, holidays, or any specific day of the week. For example, you might set 6 PM - 8 AM for weekdays and all-day protection for weekends.'
    },
    {
      question: 'What happens to messages sent during off-hours?',
      answer: 'Messages are not deleted or blocked from your Slack. SlackShield simply mutes notifications and sends an auto-response. You\'ll see all messages when you return to work. Think of it like an email out-of-office reply.'
    },
    {
      question: 'Is my Slack data secure?',
      answer: 'Yes. SlackShield uses bank-level AES-256 encryption for all tokens and credentials. We\'re SOC 2 Type II compliant and never access your message content unless you explicitly grant permission for auto-response functionality.'
    },
    {
      question: 'Can I use SlackShield with multiple workspaces?',
      answer: 'Yes! Free plan supports 1 workspace. Pro supports up to 3 workspaces. Team plan has unlimited workspaces. Each workspace can have its own schedule and settings.'
    },
    {
      question: 'What if I have an actual emergency?',
      answer: 'Your auto-response can include emergency contact information. You can also quickly disable SlackShield from the dashboard if you need to be available during normally off-hours.'
    },
    {
      question: 'Do I need admin approval to install SlackShield?',
      answer: 'For personal use, no—you can install it yourself. For team-wide deployment, your Slack workspace admin will need to approve the app installation. We provide documentation to help with the approval process.'
    }
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="faq">
      <div className="container">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${openIndex === index ? 'open' : ''}`}>
              <button
                className="faq-question"
                onClick={() => toggleFAQ(index)}
              >
                <span>{faq.question}</span>
                <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
              </button>
              {openIndex === index && (
                <div className="faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ
