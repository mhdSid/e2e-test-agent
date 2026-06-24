/**
 * Model-agnostic generator.
 * Wraps the Anthropic SDK today; swap for Bedrock SDK by changing this file only.
 * All orchestrators call generate() — none import Anthropic directly.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { GeneratorRequest } from '../core/types'

const client = new Anthropic()

export async function generate (req: GeneratorRequest): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: req.userTurn }
  ]

  if (req.prefill !== undefined) {
    messages.push({ role: 'assistant', content: req.prefill })
  }

  const response = await client.messages.create({
    model: req.model,
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    system: req.system,
    messages
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new Error(`Unexpected response block type: ${block.type}`)
  }

  return req.prefill !== undefined
    ? `${req.prefill}\n${block.text}`
    : block.text
}
