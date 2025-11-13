{{/*
Expand the name of the chart.
*/}}
{{- define "luna-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "luna-backend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "luna-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "luna-backend.labels" -}}
helm.sh/chart: {{ include "luna-backend.chart" . }}
{{ include "luna-backend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "luna-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "luna-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "luna-backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "luna-backend.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "luna-backend.databaseURL" -}}
{{- if .Values.postgresql.external.enabled }}
postgresql://{{ .Values.postgresql.external.username }}:{{ .Values.postgresql.external.password }}@{{ .Values.postgresql.external.host }}:{{ .Values.postgresql.external.port }}/{{ .Values.postgresql.external.database }}
{{- else }}
postgresql://{{ .Values.postgresql.auth.username }}:{{ .Values.postgresql.auth.password }}@{{ include "luna-backend.fullname" . }}-postgresql:5432/{{ .Values.postgresql.auth.database }}
{{- end }}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "luna-backend.redisURL" -}}
{{- if .Values.redis.external.enabled }}
redis://{{ .Values.redis.external.host }}:{{ .Values.redis.external.port }}/0
{{- else }}
redis://{{ include "luna-backend.fullname" . }}-redis-master:6379/0
{{- end }}
{{- end }}

{{/*
RabbitMQ URL
*/}}
{{- define "luna-backend.rabbitmqURL" -}}
{{- if .Values.rabbitmq.external.enabled }}
amqp://{{ .Values.rabbitmq.external.username }}:{{ .Values.rabbitmq.external.password }}@{{ .Values.rabbitmq.external.host }}:{{ .Values.rabbitmq.external.port }}//
{{- else }}
amqp://{{ .Values.rabbitmq.auth.username }}:{{ .Values.rabbitmq.auth.password }}@{{ include "luna-backend.fullname" . }}-rabbitmq:5672//
{{- end }}
{{- end }}

{{/*
MinIO Endpoint
*/}}
{{- define "luna-backend.minioEndpoint" -}}
{{- if .Values.minio.external.enabled }}
{{- .Values.minio.external.endpoint }}
{{- else }}
{{- if .Values.minio.external.useSSL }}https{{- else }}http{{- end }}://{{ include "luna-backend.fullname" . }}-minio:9000
{{- end }}
{{- end }}
