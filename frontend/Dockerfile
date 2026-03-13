# Use nginx alpine as base image
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files as templates
COPY index.html /tmp/index.html.template
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/

# Set default backend URL for local development
ENV BACKEND_URL=http://backend:3000

# Expose port 80
EXPOSE 80

# Create startup script to substitute environment variables
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst < /tmp/index.html.template > /usr/share/nginx/html/index.html' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]