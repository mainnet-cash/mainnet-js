server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location ^~ / {
        proxy_pass http://127.0.0.1:3000;
        proxy_redirect off;
    }

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt/;
        default_type "text/plain";
        log_not_found off;
    }
}