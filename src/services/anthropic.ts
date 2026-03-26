export const anthropicService = {
  async generateProjectName(description: string): Promise<string> {
    const response = await fetch('/api/ai/generate-project-name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate project name')
    }

    const data = await response.json()
    return data.name
  },

  async estimateProjectCost(
    description: string,
    squareFootage: number,
  ): Promise<number> {
    const response = await fetch('/api/ai/estimate-cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description, squareFootage }),
    })

    if (!response.ok) {
      throw new Error('Failed to estimate project cost')
    }

    const data = await response.json()
    return data.estimatedCost
  },

  async generateProjectManifest(projectId: string): Promise<string> {
    const response = await fetch('/api/ai/generate-manifest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate manifest')
    }

    const data = await response.json()
    return data.manifest
  },
}
