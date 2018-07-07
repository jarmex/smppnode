module.exports = function(api) {
  api.cache(true);
  const config = {
    comments: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: '10.5',
          },
          loose: true,
        },
      ],
    ],
    plugins: [
      ['@babel/proposal-object-rest-spread', { useBuiltIns: true }],
      ['@babel/plugin-proposal-class-properties'],
    ],
  };
  return config;
};
