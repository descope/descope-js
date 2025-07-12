export function createErrorComponent({ mainMessage = 'An error occurred' }) {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-id', 'widget-error');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.padding = '72px 36px';
  wrapper.style.background = '#fff';
  wrapper.style.borderRadius = '12px';
  wrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
  wrapper.style.margin = '32px auto';
  wrapper.style.maxWidth = '400px';

  // Icon
  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" stroke="#FF3B3B" stroke-width="3" fill="#fff"/>
      <text x="20" y="27" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#FF3B3B">!</text>
    </svg>
  `;
  icon.style.marginBottom = '12px';
  wrapper.appendChild(icon);

  // Main message
  const main = document.createElement('div');
  main.textContent = mainMessage;
  main.style.fontWeight = 'bold';
  main.style.fontSize = '20px';
  main.style.color = '#222';
  main.style.textAlign = 'center';
  main.style.marginTop = '8px';
  wrapper.appendChild(main);

  return wrapper;
}
