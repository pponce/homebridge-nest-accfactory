{
  nest_plus_update_checkout() {
    local old_dir="$HOME/devProjects/homebridge-nest-accfactory"
    local new_dir="$HOME/devProjects/homebridge-nest-accfactory-plus"
    local checkout_dir origin_url

    if [ -d "$old_dir" ] && [ -e "$new_dir" ]; then
      printf '%s\n' "Both checkout paths exist; nothing changed. Resolve this before retrying."
      return 1
    fi
    if [ -d "$old_dir" ]; then
      checkout_dir="$old_dir"
    elif [ -d "$new_dir" ]; then
      checkout_dir="$new_dir"
    else
      printf '%s\n' "Neither checkout directory exists."
      return 1
    fi
    git -C "$checkout_dir" rev-parse --show-toplevel >/dev/null || return 1
    if [ -n "$(git -C "$checkout_dir" status --porcelain)" ]; then
      printf '%s\n' "Local changes found. Commit or stash them first; nothing changed."
      return 1
    fi
    origin_url=$(git -C "$checkout_dir" remote get-url origin) || return 1
    case "$origin_url" in
      https://github.com/pponce/homebridge-nest-accfactory|https://github.com/pponce/homebridge-nest-accfactory.git|https://github.com/pponce/homebridge-nest-accfactory-plus|https://github.com/pponce/homebridge-nest-accfactory-plus.git|git@github.com:pponce/homebridge-nest-accfactory.git|git@github.com:pponce/homebridge-nest-accfactory-plus.git) ;;
      *) printf '%s\n' "Unexpected origin: $origin_url. Nothing changed."; return 1 ;;
    esac
    if [ "$checkout_dir" = "$old_dir" ]; then
      mv "$old_dir" "$new_dir" || return 1
    fi
    case "$origin_url" in
      git@*) origin_url='git@github.com:pponce/homebridge-nest-accfactory-plus.git' ;;
      *) origin_url='https://github.com/pponce/homebridge-nest-accfactory-plus.git' ;;
    esac
    git -C "$new_dir" remote set-url origin "$origin_url" &&
      git -C "$new_dir" fetch origin --tags || return 1
    if git -C "$new_dir" show-ref --verify --quiet refs/heads/main; then
      git -C "$new_dir" switch main || return 1
    else
      git -C "$new_dir" switch --create main --track origin/main || return 1
    fi
    git -C "$new_dir" merge --ff-only origin/main &&
      git -C "$new_dir" submodule sync --recursive &&
      git -C "$new_dir" submodule update --init --recursive || return 1
    printf '%s\n' "Updated: $new_dir" "Your running Homebridge installation has not been changed."
  }
  if nest_plus_update_checkout; then
    printf '%s\n' "Checkout update complete."
  else
    printf '%s\n' "Stopped at the failed step. Your SSH session remains open; no local commits were discarded."
  fi
  unset -f nest_plus_update_checkout
}
