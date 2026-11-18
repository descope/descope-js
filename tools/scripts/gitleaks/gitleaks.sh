# Run detect-secrets
lint_find_secrets() {
	echo "- Running secrets check"
	SECRETS_SUPPORTED_VERSION="8.8.11"
	INSTALLED_SECRETS_VERSION="$(gitleaks version)"
	if [[ $INSTALLED_SECRETS_VERSION != *"$SECRETS_SUPPORTED_VERSION"* ]]; then
		OS=$(uname -s | tr '[:upper:]' '[:lower:]')
		case "$(uname -m)" in
			x86_64|amd64) ARCH="x64" ;;
			arm64|aarch64) ARCH="arm64" ;;
			*) echo "Unsupported architecture $(uname -m)"; exit 1 ;;
		esac
		# sha256 values from the release's gitleaks_8.8.11_checksums.txt
		case "${OS}_${ARCH}" in
			linux_x64) SHA256="294613eb3b5ff24b7fa67d0160fc5562a432077f277902781b6c89d0de186585" ;;
			linux_arm64) SHA256="3f746a8f83f28b4811e5ba4a40b5bdcd8aefa20fe23faf767a7edefc1cef64a8" ;;
			darwin_x64) SHA256="26338f22d9da683d0ac338995d91f1bbe4048cea712e106732eaa3a9daf59899" ;;
			darwin_arm64) SHA256="c2861a229227e8b33ca36ea3724091f78cb4ad94cae17ce748b9963f8bc86e3e" ;;
			*) echo "No gitleaks build for ${OS}_${ARCH}"; exit 1 ;;
		esac
		echo "Installing gitleaks ${OS}_${ARCH} for the first time..."
		FILE="gitleaks_${SECRETS_SUPPORTED_VERSION}_${OS}_${ARCH}.tar.gz"
		TMPDIR=$(mktemp -d)
		# Download the release asset directly. The api.github.com lookup used before
		# is rate limited without a token and sometimes returned nothing in CI.
		curl -fsSL --retry 3 -o ${TMPDIR}/${FILE} https://github.com/gitleaks/gitleaks/releases/download/v${SECRETS_SUPPORTED_VERSION}/${FILE} || exit 1
		if command -v sha256sum >/dev/null; then SHA_CMD="sha256sum"; else SHA_CMD="shasum -a 256"; fi
		ACTUAL_SHA256=$($SHA_CMD ${TMPDIR}/${FILE} | cut -d' ' -f1)
		if [ "$ACTUAL_SHA256" != "$SHA256" ]; then
			echo "Checksum mismatch for ${FILE}"
			exit 1
		fi
		tar zxv -C /usr/local/bin -f ${TMPDIR}/${FILE} gitleaks
		rm ${TMPDIR}/${FILE}
		echo "Done installing gitleaks"
	fi
	echo "  - Finding leaks in git log"
	gitleaks detect -v --redact  -c tools/scripts/gitleaks/.gitleaks.toml
	if [ $? -ne 0 ]; then
		exit 1
	fi
	echo "  - Finding leaks in local repo"
	gitleaks detect --no-git -v --redact -c tools/scripts/gitleaks/.gitleaks.toml
	if [ $? -ne 0 ]; then
		exit 1
	fi
	echo "- Secrets check passed sucessfully!"
}

lint_find_secrets
