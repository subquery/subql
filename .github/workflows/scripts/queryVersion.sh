PACKAGE_VERSION=$(cat ./packages/query/package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')


echo "::set-output name=QUERY_VERSION::$PACKAGE_VERSION"
