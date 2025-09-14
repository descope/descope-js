<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <div v-if="user">
      <h1>Welcome to the Home Page, {{ user.name || user.email }}!</h1>
      <p>
        I see you used
        <span style="font-variant-caps: small-caps">{{
          claims?.amr?.[0]
        }}</span>
        to login. What a brilliant choice!
      </p>
    </div>
    <div v-else>Loading</div>
  </div>
</template>

<script setup>
import { useUser, useSession } from '../../src';

const { user } = useUser();
const { claims } = useSession();
</script>
