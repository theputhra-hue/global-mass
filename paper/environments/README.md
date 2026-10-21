# Recorded research package versions

These three inventories were recovered from the installed distribution metadata
of the original research environments on 20 October 2026. Fresh environments
were then installed from them for the isolated reconstruction.

| File | Interpreter and workload |
|---|---|
| `primary-linux.txt` | Python 3.11.2, Debian container on WSL2; original two-model fit, freeze, score and bootstrap |
| `supplement-windows.txt` | Windows Python 3.14.6; sparse baseline, four exploratory models, saved-checkpoint metrics and comparison checks |
| `anchor-windows.txt` | Windows Python 3.11.9; PyTorch 2.5.1+cu121, Transformers 4.46.3, fixed checkpoint inference |

Use the container, interpreter, CUDA and installation instructions in
[`../README.md`](../README.md). The primary image is pinned by digest. The
checkpoint runner requires the recorded runtime and GPU recipe. Changing
operating system, package build, BLAS or CUDA can change floating arithmetic.

These are package-version inventories, not complete environment or wheel-hash
locks. They include test and supporting packages present during the original
work. They do not include a PDF/plot build environment. Installation may reuse
cached package distributions; it must not copy an old fitted state or claim that
the original installed virtual environment is fresh.

The research source and data/checkpoint identities are checked separately.
`pip freeze` normally omits pip and setuptools; use installed metadata or
`pip freeze --all` when comparing a complete inventory. `uv pip freeze` was used
for the two new Windows environments, which do not contain pip.
