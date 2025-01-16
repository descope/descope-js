const initTemplate = document.createElement('template');
initTemplate.innerHTML = `
	<style>
		:host {
      all: initial;
			width: 100%;
      display: block;
		}

		#root {
			height: 100%;
      display: flex;
		}

    #content-root {
      transition: opacity 300ms ease-in-out;
    }

		#root[data-theme] {
			background-color: transparent;
		}

		.fade-out {
			opacity: 0.1;
		}

    .hidden {
      display: none;
    }

	</style>
	`;

export default initTemplate;
