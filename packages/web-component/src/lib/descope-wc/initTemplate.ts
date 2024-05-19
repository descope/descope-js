const initTemplate = document.createElement('template');
initTemplate.innerHTML = `
	<style>
		:host {
      all: initial;
			width: 100%;
			height: 100%;
      display: inline-block;
		}

		#wc-root {
			height: 100%;
			transition: opacity 300ms ease-in-out;
		}

		#wc-root[data-theme] {
			background-color: transparent;
		}

		.fade-out {
			opacity: 0.1;
		}

	</style>
	<div id="wc-root"></div>
	`;

export default initTemplate;
