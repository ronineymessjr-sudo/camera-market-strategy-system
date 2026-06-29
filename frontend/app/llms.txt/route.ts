export function GET() {
  return new Response(
    `# Camera Market Strategy System\n\nA single-user local system that separates market facts, user strategies, and triggered signals. Only VERIFIED_CHECKOUT records may trigger a strategy.\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
}
