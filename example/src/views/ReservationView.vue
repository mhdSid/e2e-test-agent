<template>
  <div data-testid="reservation-root">
    <GBreadcrumb data-testid="breadcrumb" :items="crumbs" />
    <h1 data-testid="reservation-title">Reserve a Room</h1>

    <form data-testid="reservation-form" @submit.prevent="onSubmit">
      <GFormField label="Name">
        <GInput v-model="form.name" data-testid="field-name" name="name" required />
        <span v-if="errors.name" data-testid="error-name">{{ errors.name }}</span>
      </GFormField>

      <GFormField label="Email">
        <GInput v-model="form.email" data-testid="field-email" name="email" type="email" required />
        <span v-if="errors.email" data-testid="error-email">{{ errors.email }}</span>
      </GFormField>

      <GFormField label="Players">
        <GSelect v-model="form.players" data-testid="field-players" name="players" required />
        <span v-if="errors.players" data-testid="error-players">{{ errors.players }}</span>
      </GFormField>

      <GButton
        data-testid="submit-btn"
        type="submit"
        :disabled="!meta.valid"
      >Confirm Reservation</GButton>
    </form>

    <GAlert v-if="meta.touched && !meta.valid" data-testid="form-error" variant="error">
      Please fix the errors above
    </GAlert>

    <div v-if="submitted" data-testid="success-panel">
      <GAlert data-testid="success-msg" variant="success">Reservation confirmed</GAlert>
      <RouterLink data-testid="success-home" to="/">Back home</RouterLink>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { useForm } from 'vee-validate'
import { GBreadcrumb, GFormField, GInput, GSelect, GButton, GAlert } from '@gora/design-system'
import { reservationSchema } from '../schemas/reservation'

const { errors, meta, handleSubmit } = useForm({ validationSchema: reservationSchema })

const form = reactive({ name: '', email: '', players: '' })
const submitted = ref(false)

const crumbs = [
  { label: 'Home', to: '/' },
  { label: 'Reserve', to: '/reserve' }
]

const onSubmit = handleSubmit(() => {
  submitted.value = true
})
</script>
