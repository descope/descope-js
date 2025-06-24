export default `
<descope-container
  data-editor-type="container"
  direction="column"
  id="ROOT"
  space-between="md"
  st-horizontal-padding="1rem"
  st-vertical-padding="1rem"
  st-align-items="safe center"
  st-justify-content="safe center"
  st-background-color=""
  st-host-width="100%"
  st-gap="1rem"
  ><descope-container
    data-editor-type="container"
    direction="row"
    id="avatarContainer"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
    st-align-items="start"
    st-justify-content="flex-start"
    st-background-color="#ffffff00"
    st-host-width="100%"
    st-gap="0rem"
    ><descope-avatar
      flow-id="update-pic"
      editable="true"
      data-id="avatar"
      size="lg"
    ></descope-avatar></descope-container
  ><descope-container
    data-editor-type="container"
    direction="column"
    id="userAttrsContainer"
    st-horizontal-padding="0rem"
    st-vertical-padding="1rem"
    st-align-items="start"
    st-justify-content="flex-start"
    st-background-color="#ffffff00"
    st-host-width="100%"
    st-gap="2rem"
    ><descope-text
      full-width="false"
      id="userAttrsTitle"
      italic="false"
      mode="primary"
      text-align="center"
      variant="subtitle2"
      >Personal Information</descope-text
    ><descope-user-attribute
      edit-flow-id="test-widget"
      delete-flow-id="test-widget"
      data-id="email"
      placeholder="Add an email"
      full-width="true"
      label="Email"
      required="false"
    ></descope-user-attribute
    ><descope-user-attribute
      edit-flow-id="test-widget"
      delete-flow-id="test-widget"
      data-id="name"
      full-width="true"
      label="Name"
      required="false"
    ></descope-user-attribute
    ><descope-user-attribute
      edit-flow-id="test-widget"
      delete-flow-id="test-widget"
      data-id="phone"
      placeholder="Add a phone number"
      full-width="true"
      label="Phone"
      required="false"
    ></descope-user-attribute></descope-container
  ><descope-divider
    id="divider1"
    italic="false"
    mode="primary"
    variant="body1"
    vertical="false"
  ></descope-divider
  ><descope-container
    data-editor-type="container"
    direction="column"
    id="authMethodsContainer"
    st-horizontal-padding="0rem"
    st-vertical-padding="1rem"
    st-align-items="start"
    st-justify-content="flex-start"
    st-background-color="#ffffff00"
    st-host-width="100%"
    st-gap="2rem"
    ><descope-text
      full-width="false"
      id="authMethodsTitle"
      italic="false"
      mode="primary"
      text-align="center"
      variant="subtitle2"
      >Authentication Methods</descope-text
    ><descope-user-auth-method
      flow-id="test-widget"
      data-id="passkey"
      button-label="Add"
      full-width="true"
      label="Passkey"
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 29 30"
        width="1.5em"
        height="1.5em"
        fill="#000000"
        data-icon="fingerprint"
        slot="method-icon"
      >
        <path
          d="M21.5204 5.5875C21.4238 5.5875 21.3271 5.5625 21.2425 5.5125C18.9225 4.275 16.9167 3.75 14.5121 3.75C12.1196 3.75 9.84792 4.3375 7.78167 5.5125C7.49167 5.675 7.12917 5.5625 6.96 5.2625C6.80292 4.9625 6.91167 4.575 7.20167 4.4125C9.44917 3.15 11.9142 2.5 14.5121 2.5C17.0858 2.5 19.3333 3.0875 21.7983 4.4C22.1004 4.5625 22.2092 4.9375 22.0521 5.2375C21.9433 5.4625 21.7379 5.5875 21.5204 5.5875V5.5875ZM4.22917 12.15C4.10834 12.15 3.9875 12.1125 3.87875 12.0375C3.60084 11.8375 3.54042 11.45 3.73375 11.1625C4.93 9.4125 6.4525 8.0375 8.265 7.075C12.0592 5.05 16.9167 5.0375 20.7229 7.0625C22.5354 8.025 24.0579 9.3875 25.2542 11.125C25.4475 11.4 25.3871 11.8 25.1092 12C24.8313 12.2 24.4567 12.1375 24.2633 11.85C23.1758 10.275 21.7983 9.0375 20.1671 8.175C16.6992 6.3375 12.2646 6.3375 8.80875 8.1875C7.16542 9.0625 5.78792 10.3125 4.70042 11.8875C4.60375 12.0625 4.4225 12.15 4.22917 12.15V12.15ZM11.7813 27.2375C11.6242 27.2375 11.4671 27.175 11.3583 27.05C10.3071 25.9625 9.73917 25.2625 8.92959 23.75C8.09584 22.2125 7.66084 20.3375 7.66084 18.325C7.66084 14.6125 10.73 11.5875 14.5 11.5875C18.27 11.5875 21.3392 14.6125 21.3392 18.325C21.3392 18.675 21.0733 18.95 20.735 18.95C20.3967 18.95 20.1308 18.675 20.1308 18.325C20.1308 15.3 17.6054 12.8375 14.5 12.8375C11.3946 12.8375 8.86917 15.3 8.86917 18.325C8.86917 20.125 9.25584 21.7875 9.99292 23.1375C10.7663 24.575 11.2979 25.1875 12.2283 26.1625C12.4579 26.4125 12.4579 26.8 12.2283 27.05C12.0954 27.175 11.9383 27.2375 11.7813 27.2375ZM20.445 24.925C19.0071 24.925 17.7383 24.55 16.6992 23.8125C14.8988 22.55 13.8233 20.5 13.8233 18.325C13.8233 17.975 14.0892 17.7 14.4275 17.7C14.7658 17.7 15.0317 17.975 15.0317 18.325C15.0317 20.0875 15.9017 21.75 17.3758 22.775C18.2338 23.375 19.2367 23.6625 20.445 23.6625C20.735 23.6625 21.2183 23.625 21.7017 23.5375C22.0279 23.475 22.3421 23.7 22.4025 24.05C22.4629 24.3875 22.2454 24.7125 21.9071 24.775C21.2183 24.9125 20.6142 24.925 20.445 24.925V24.925ZM18.0163 27.5C17.9679 27.5 17.9075 27.4875 17.8592 27.475C15.9379 26.925 14.6813 26.1875 13.3642 24.85C11.6725 23.1125 10.7421 20.8 10.7421 18.325C10.7421 16.3 12.4096 14.65 14.4638 14.65C16.5179 14.65 18.1854 16.3 18.1854 18.325C18.1854 19.6625 19.3092 20.75 20.6988 20.75C22.0883 20.75 23.2121 19.6625 23.2121 18.325C23.2121 13.6125 19.285 9.7875 14.4517 9.7875C11.02 9.7875 7.87834 11.7625 6.46459 14.825C5.99334 15.8375 5.75167 17.025 5.75167 18.325C5.75167 19.3 5.83625 20.8375 6.56125 22.8375C6.68209 23.1625 6.525 23.525 6.21084 23.6375C5.89667 23.7625 5.54625 23.5875 5.4375 23.275C4.84542 21.6375 4.55542 20.0125 4.55542 18.325C4.55542 16.825 4.83334 15.4625 5.37709 14.275C6.98417 10.7875 10.5488 8.525 14.4517 8.525C19.9496 8.525 24.4204 12.9125 24.4204 18.3125C24.4204 20.3375 22.7529 21.9875 20.6988 21.9875C18.6446 21.9875 16.9771 20.3375 16.9771 18.3125C16.9771 16.975 15.8533 15.8875 14.4638 15.8875C13.0742 15.8875 11.9504 16.975 11.9504 18.3125C11.9504 20.45 12.7479 22.45 14.21 23.95C15.3579 25.125 16.4575 25.775 18.1613 26.2625C18.4875 26.35 18.6688 26.7 18.5842 27.025C18.5238 27.3125 18.27 27.5 18.0163 27.5V27.5Z"
        ></path></svg
      ><svg
        height="1em"
        viewBox="0 0 12 12"
        width="1em"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        slot="button-icon"
      >
        <path
          d="M5.2181 5.2181H1.22305C0.791359 5.2181 0.441406 5.56805 0.441406 5.99974C0.441406 6.43143 0.791359 6.78138 1.22305 6.78138H5.2181V10.7764C5.2181 11.2081 5.56805 11.5581 5.99974 11.5581C6.43143 11.5581 6.78138 11.2081 6.78138 10.7764V6.78138H10.7764C11.2081 6.78138 11.5581 6.43143 11.5581 5.99974C11.5581 5.56805 11.2081 5.2181 10.7764 5.2181H6.78138V1.22305C6.78138 0.791359 6.43143 0.441406 5.99974 0.441406C5.56805 0.441406 5.2181 0.791359 5.2181 1.22305V5.2181Z"
          fill="currentColor"
        ></path></svg></descope-user-auth-method
    ><descope-user-auth-method
      flow-id="test-widget"
      data-id="password"
      button-label="Reset password"
      full-width="true"
      label="Password"
      ><svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        slot="method-icon"
      >
        <path
          d="M2 17H22V19H2V17ZM3.15 12.95L4 11.47L4.85 12.95L6.15 12.2L5.3 10.72H7V9.22H5.3L6.15 7.75L4.85 7L4 8.47L3.15 7L1.85 7.75L2.7 9.22H1V10.72H2.7L1.85 12.2L3.15 12.95ZM9.85 12.2L11.15 12.95L12 11.47L12.85 12.95L14.15 12.2L13.3 10.72H15V9.22H13.3L14.15 7.75L12.85 7L12 8.47L11.15 7L9.85 7.75L10.7 9.22H9V10.72H10.7L9.85 12.2ZM23 9.22H21.3L22.15 7.75L20.85 7L20 8.47L19.15 7L17.85 7.75L18.7 9.22H17V10.72H18.7L17.85 12.2L19.15 12.95L20 11.47L20.85 12.95L22.15 12.2L21.3 10.72H23V9.22Z"
          fill="#808080"
        ></path></svg
      ><svg
        width="1em"
        height="1em"
        viewBox="0 0 14 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        slot="button-icon"
      >
        <path
          d="M2.00065 8.83398C2.00065 7.45898 2.55898 6.20898 3.46732 5.30065L2.28398 4.11732C1.08398 5.32565 0.333984 6.99232 0.333984 8.83398C0.333984 12.234 2.87565 15.034 6.16732 15.4423V13.759C3.80898 13.359 2.00065 11.309 2.00065 8.83398ZM13.6673 8.83398C13.6673 5.15065 10.684 2.16732 7.00065 2.16732C6.95065 2.16732 6.90065 2.17565 6.85065 2.17565L7.75898 1.26732L6.58398 0.0839844L3.66732 3.00065L6.58398 5.91732L7.75898 4.74232L6.85898 3.84232C6.90898 3.84232 6.95898 3.83398 7.00065 3.83398C9.75898 3.83398 12.0007 6.07565 12.0007 8.83398C12.0007 11.309 10.1923 13.359 7.83398 13.759V15.4423C11.1257 15.034 13.6673 12.234 13.6673 8.83398Z"
          fill="currentColor"
        ></path></svg></descope-user-auth-method>
        <descope-user-auth-method button-label="Edit TOTP" data-id="totp" flow-id="user-profile-reset-totp" full-width="true" id="cVd-kJLggr" label="Authenticator App" class="descope-user-auth-method">
          <descope-icon src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0LjI0IDUuNzQ5OTlDMTMuMDcgNC41Nzk5OSAxMS41NCAzLjk4OTk5IDEwIDMuOTg5OTlWOS45ODk5OUw1Ljc2IDE0LjIzQzguMSAxNi41NyAxMS45IDE2LjU3IDE0LjI1IDE0LjIzQzE2LjU5IDExLjg5IDE2LjU5IDguMDg5OTkgMTQuMjQgNS43NDk5OVpNMTAgLTAuMDEwMDA5OEM0LjQ4IC0wLjAxMDAwOTggMCA0LjQ2OTk5IDAgOS45ODk5OUMwIDE1LjUxIDQuNDggMTkuOTkgMTAgMTkuOTlDMTUuNTIgMTkuOTkgMjAgMTUuNTEgMjAgOS45ODk5OUMyMCA0LjQ2OTk5IDE1LjUyIC0wLjAxMDAwOTggMTAgLTAuMDEwMDA5OFpNMTAgMTcuOTlDNS41OCAxNy45OSAyIDE0LjQxIDIgOS45ODk5OUMyIDUuNTY5OTkgNS41OCAxLjk4OTk5IDEwIDEuOTg5OTlDMTQuNDIgMS45ODk5OSAxOCA1LjU2OTk5IDE4IDkuOTg5OTlDMTggMTQuNDEgMTQuNDIgMTcuOTkgMTAgMTcuOTlaIiBmaWxsPSIjNjM2Qzc0Ii8+Cjwvc3ZnPgo=" st-fill="currentColor" slot="method-icon" class="descope-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="var(--descope-icon-fill, none)" viewBox="0 0 20 20" height="20" width="20" style="max-width: 100%; max-height: 100%;">
                <path fill="var(--descope-icon-fill, #636C74)" d="M14.24 5.74999C13.07 4.57999 11.54 3.98999 10 3.98999V9.98999L5.76 14.23C8.1 16.57 11.9 16.57 14.25 14.23C16.59 11.89 16.59 8.08999 14.24 5.74999ZM10 -0.0100098C4.48 -0.0100098 0 4.46999 0 9.98999C0 15.51 4.48 19.99 10 19.99C15.52 19.99 20 15.51 20 9.98999C20 4.46999 15.52 -0.0100098 10 -0.0100098ZM10 17.99C5.58 17.99 2 14.41 2 9.98999C2 5.56999 5.58 1.98999 10 1.98999C14.42 1.98999 18 5.56999 18 9.98999C18 14.41 14.42 17.99 10 17.99Z"></path>
              </svg>
          </descope-icon>
          <descope-icon src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMTUiIHZpZXdCb3g9IjAgMCAxNSAxNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwLjAwMDIgMC45OTIwMjdDMTAuMDAwMiAxLjAxNjAzIDEwLjAwMDIgMS4wMTYwMyAxMC4wMDAyIDEuMDE2MDNMOC4yMjQxOSAzLjAwODAzSDIuOTkyMTlDMi40NjQxOSAzLjAwODAzIDIuMDA4MTkgMy40NDAwMyAyLjAwODE5IDMuOTkyMDNWMTIuMDA4QzIuMDA4MTkgMTIuNTM2IDIuNDQwMTkgMTIuOTkyIDIuOTkyMTkgMTIuOTkySDUuNTM2MTlDNS44NDgxOSAxMy4wNCA2LjE2MDE5IDEzLjA0IDYuNDcyMTkgMTIuOTkySDExLjAwODJDMTEuNTM2MiAxMi45OTIgMTEuOTkyMiAxMi41NiAxMS45OTIyIDEyLjAwOFY3Ljc4NDAzTDEzLjkzNjIgNS42MjQwM0wxNC4wMDgyIDUuNjcyMDNWMTEuOTg0QzE0LjAwODIgMTMuNjY0IDEyLjY2NDIgMTUuMDA4IDExLjAwODIgMTUuMDA4SDMuMDE2MTlDMS4zMzYxOSAxNS4wMDggLTAuMDA3ODEyNSAxMy42NjQgLTAuMDA3ODEyNSAxMS45ODRWMy45OTIwM0MtMC4wMDc4MTI1IDIuMzM2MDMgMS4zMzYxOSAwLjk5MjAyNyAzLjAxNjE5IDAuOTkyMDI3SDEwLjAwMDJaTTExLjI3MjIgMi42MjQwM0wxMi42MTYyIDQuMTEyMDNMNy43MjAxOSA5LjY4MDA0QzcuNTA0MTkgOS45MjAwNCA2LjgzMjE5IDEwLjIzMiA1LjY4MDE5IDEwLjYxNkM1LjY1NjE5IDEwLjY0IDUuNjA4MTkgMTAuNjQgNS41NjAxOSAxMC42MTZDNS40NjQxOSAxMC41OTIgNS4zOTIxOSAxMC40NzIgNS40NDAxOSAxMC4zNzZDNS43NTIxOSA5LjI0ODAzIDYuMDQwMTkgOC41NTIwMyA2LjI1NjE5IDguMzEyMDNMMTEuMjcyMiAyLjYyNDAzWk0xMS45MjAyIDEuODU2MDNMMTMuMjg4MiAwLjMyMDAyN0MxMy42NDgyIC0wLjA4Nzk3MzYgMTQuMjcyMiAtMC4xMTE5NzQgMTQuNjgwMiAwLjI3MjAyN0MxNS4wODgyIDAuNjMyMDI3IDE1LjExMjIgMS4yODAwMyAxNC43NTIyIDEuNjg4MDNMMTMuMjY0MiAzLjM2ODAzTDExLjkyMDIgMS44NTYwM1oiIGZpbGw9IiMwMDZBRjUiLz4KPC9zdmc+Cg==" st-fill="currentColor" slot="button-icon" width="1em" height="1em" class="descope-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="var(--descope-icon-fill, none)" viewBox="0 0 15 15" height="15" width="15" style="max-width: 100%; max-height: 100%;">
                <path fill="var(--descope-icon-fill, #006AF5)" d="M10.0002 0.992027C10.0002 1.01603 10.0002 1.01603 10.0002 1.01603L8.22419 3.00803H2.99219C2.46419 3.00803 2.00819 3.44003 2.00819 3.99203V12.008C2.00819 12.536 2.44019 12.992 2.99219 12.992H5.53619C5.84819 13.04 6.16019 13.04 6.47219 12.992H11.0082C11.5362 12.992 11.9922 12.56 11.9922 12.008V7.78403L13.9362 5.62403L14.0082 5.67203V11.984C14.0082 13.664 12.6642 15.008 11.0082 15.008H3.01619C1.33619 15.008 -0.0078125 13.664 -0.0078125 11.984V3.99203C-0.0078125 2.33603 1.33619 0.992027 3.01619 0.992027H10.0002ZM11.2722 2.62403L12.6162 4.11203L7.72019 9.68004C7.50419 9.92004 6.83219 10.232 5.68019 10.616C5.65619 10.64 5.60819 10.64 5.56019 10.616C5.46419 10.592 5.39219 10.472 5.44019 10.376C5.75219 9.24803 6.04019 8.55203 6.25619 8.31203L11.2722 2.62403ZM11.9202 1.85603L13.2882 0.320027C13.6482 -0.0879736 14.2722 -0.111974 14.6802 0.272027C15.0882 0.632027 15.1122 1.28003 14.7522 1.68803L13.2642 3.36803L11.9202 1.85603Z"></path>
              </svg>
          </descope-icon>
        </descope-user-auth-method>
      </descope-container
  ><descope-divider
    id="divider2"
    italic="false"
    mode="primary"
    variant="body1"
    vertical="false"
  ></descope-divider
  ><descope-container
    data-editor-type="container"
    direction="column"
    id="logoutContainer"
    st-horizontal-padding="0rem"
    st-vertical-padding="1rem"
    st-align-items="start"
    st-justify-content="flex-start"
    st-background-color="#ffffff00"
    st-host-width="100%"
    st-gap="2rem"
    ><descope-button
      data-id="logout"
      auto-submit="true"
      data-type="button"
      formnovalidate="false"
      full-width="false"
      id="logoutBtn"
      shape=""
      size="lg"
      variant="link"
      mode="error"
      square="false"
      >Logout</descope-button
    ></descope-container
  ></descope-container
>
`;
