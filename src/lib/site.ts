/** 站点仓库信息（顶部导航的 GitHub 按钮使用） */
export const REPO = {
  owner: "FireGuo1145",
  name: "algo-lab",
  get url() {
    return `https://github.com/${this.owner}/${this.name}`
  },
} as const
