import { createBedrockModel } from './bedrock-model.js'
import { createMockModel } from './mock-model.js'

export function createResearchModel({
  provider,
  environment,
  env = globalThis.process?.env,
  createBedrock = createBedrockModel
} = {}) {
  const selectedProvider = provider || env?.AGENT_MODEL_PROVIDER || 'bedrock'
  const selectedEnvironment = environment || env?.NODE_ENV

  if (selectedProvider === 'bedrock') {
    return createBedrock()
  }

  if (selectedProvider === 'mock') {
    if (!['development', 'test'].includes(selectedEnvironment)) {
      throw new Error('Mock research model is unavailable outside development')
    }

    return createMockModel()
  }

  throw new Error('Unsupported research model provider')
}
