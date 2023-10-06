#!/usr/bin/env bash
# Auto-start PostgreSQL server
(
	if mkdir /tmp/.pgsql_lock 2>/dev/null; then {
		target="${PGWORKSPACE}"
		source="${target//\/workspace/$HOME}"

		if test -e "$source"; then {

			if test ! -e "$target"; then {
				mv "$source" "$target"
			}; fi

			if ! [[ "$(pg_ctl status)" =~ PID ]]; then {
				printf 'INFO: %s\n' "Executing command: pg_start"
				pg_start
				trap "pg_stop" TERM EXIT
				exec {sfd}<> <(:)
				printf 'INFO: %s\n' \
					"Please create another terminal" \
					"this one is monitoring postgres server for gracefully shutting down when needed"
				until read -r -t 3600 -u $sfd; do continue; done
			}; fi

		}; fi
	}; fi &
)
