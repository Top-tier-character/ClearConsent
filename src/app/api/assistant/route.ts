import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    // Extract last user message
    const userMessage = messages[messages.length - 1].content;

    // Mock response logic based on user input
    let assistantReply = "I'm ClearConsent's AI assistant. I can help you understand your loan terms or simulations.";
    
    if (userMessage.toLowerCase().includes('interest') || userMessage.toLowerCase().includes('rate')) {
      assistantReply = "Interest rate is the cost of borrowing money. A lower interest rate means you pay less over time. Make sure you check if your rate is fixed or floating!";
    } else if (userMessage.toLowerCase().includes('emi')) {
      assistantReply = "EMI stands for Equated Monthly Installment. It's the fixed amount you pay to the bank every month. A good rule of thumb is to keep your EMI below 30% of your monthly income.";
    } else if (userMessage.toLowerCase().includes('penalty') || userMessage.toLowerCase().includes('late')) {
      assistantReply = "Late payment penalties can severely impact your finances and credit score. It's important to pay on time to avoid fees and a negative credit mark.";
    }

    return NextResponse.json({ reply: assistantReply }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error during chat' }, { status: 500 });
  }
}
