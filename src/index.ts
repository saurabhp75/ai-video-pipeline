// index.ts

import { viralShortWorkflow } from './workflows/viralShortWorkflow'

async function main() {
  const result = await viralShortWorkflow(
    'Indian cyberpunk street food market in monsoon with cinematic camera motion'
  )

  console.log(result)
}

main()
