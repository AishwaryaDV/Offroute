"""Per-circuit chat assistant ("Ask AI").

Provider-neutral tool layer + drivers. Every tool wraps an existing service and
is scoped to one circuit via closures (never via tool arguments), so the model
can only touch data the authenticated user owns.
"""
